from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from .models import Conversation, Message
from .serializers import TYPING_TIMEOUT_SECONDS, ConversationSerializer, MessageSerializer


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Conversation.objects
            .filter(Q(buyer=self.request.user) | Q(seller=self.request.user))
            .select_related("buyer", "seller", "store")
            .prefetch_related("messages__sender")
            .order_by("-updated_at")
        )

    def create(self, request, *args, **kwargs):
        seller_id = request.data.get("seller")
        store_id = request.data.get("store") or None
        if not seller_id:
            return Response({"seller": ["A seller is required."]}, status=status.HTTP_400_BAD_REQUEST)
        if str(seller_id) == str(request.user.id):
            return Response({"seller": ["You cannot message yourself."]}, status=status.HTTP_400_BAD_REQUEST)

        from accounts.models import User
        from catalog.models import Store
        try:
            seller = User.objects.get(pk=seller_id, is_active=True)
        except User.DoesNotExist:
            return Response({"seller": ["Seller not found."]}, status=status.HTTP_404_NOT_FOUND)
        store = None
        if store_id:
            store = Store.objects.filter(pk=store_id).first()

        from accounts.api_views import _preferences
        if not _preferences(seller).settings.get("contact", True):
            return Response({"detail": "This member is not accepting new conversations."}, status=status.HTTP_403_FORBIDDEN)

        conversation, _ = Conversation.objects.get_or_create(
            buyer=request.user, seller=seller, store=store
        )
        serializer = self.get_serializer(conversation)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def typing(self, request, pk=None):
        """Record that the current user is typing in this conversation.
        The frontend debounces/throttles calls to this endpoint (roughly one
        every couple of seconds) so it stays cheap even while the user types."""
        conversation = get_object_or_404(
            Conversation.objects.filter(Q(buyer=request.user) | Q(seller=request.user)),
            pk=pk,
        )
        now = timezone.now()
        if request.user.id == conversation.buyer_id:
            conversation.buyer_typing_at = now
            conversation.save(update_fields=["buyer_typing_at"])
        elif request.user.id == conversation.seller_id:
            conversation.seller_typing_at = now
            conversation.save(update_fields=["seller_typing_at"])
        else:
            raise PermissionDenied("You are not a member of this conversation.")
        return Response({"ok": True})

    @action(detail=True, methods=["get"])
    def status(self, request, pk=None):
        """Lightweight endpoint for polling clients: just the typing state,
        without the heavier nested-messages payload used by the main
        list/retrieve views."""
        conversation = get_object_or_404(
            Conversation.objects.filter(Q(buyer=request.user) | Q(seller=request.user)),
            pk=pk,
        )
        if request.user.id == conversation.buyer_id:
            typing_at = conversation.seller_typing_at
        elif request.user.id == conversation.seller_id:
            typing_at = conversation.buyer_typing_at
        else:
            typing_at = None
        other_typing = bool(
            typing_at and (timezone.now() - typing_at).total_seconds() < TYPING_TIMEOUT_SECONDS
        )
        return Response({"id": conversation.id, "other_typing": other_typing})


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            Message.objects
            .filter(Q(conversation__buyer=self.request.user) | Q(conversation__seller=self.request.user))
            .select_related("sender", "conversation", "listing", "listing__store")
            .order_by("created_at")
        )
        conversation_id = self.request.query_params.get("conversation")
        if conversation_id:
            queryset = queryset.filter(conversation_id=conversation_id)
        # Efficient polling support: return only messages newer than `after`
        # (a message id) so the client doesn't re-download the whole thread
        # every ~1s while a conversation is open.
        after_id = self.request.query_params.get("after")
        if after_id:
            try:
                queryset = queryset.filter(id__gt=int(after_id))
            except (TypeError, ValueError):
                pass
        return queryset

    def perform_create(self, serializer):
        conversation = serializer.validated_data["conversation"]
        if self.request.user not in (conversation.buyer, conversation.seller):
            raise PermissionDenied("You are not a member of this conversation.")
        listing = serializer.validated_data.get("listing")
        product_snapshot = {}
        if listing is not None:
            image = listing.images.order_by("sort_order", "id").first()
            image_url = image.image if image else None
            if image_url:
                image_url = str(image_url)
                if not image_url.startswith(("http://", "https://")):
                    image_url = self.request.build_absolute_uri(image_url if image_url.startswith("/") else f"/media/{image_url}")
            display_price = listing.offer_price if listing.is_on_offer and listing.offer_price is not None else listing.price
            product_snapshot = {
                "id": listing.id,
                "title": listing.title,
                "image": image_url,
                "price": str(display_price) if display_price is not None else None,
                "currency": (listing.currency or "KES").upper(),
                "original_price": str(listing.price) if listing.price is not None else None,
                "is_on_offer": bool(listing.is_on_offer),
                "store_name": listing.store.name if listing.store else None,
            }
        message = serializer.save(sender=self.request.user, product_snapshot=product_snapshot)
        Conversation.objects.filter(pk=conversation.pk).update(updated_at=timezone.now())
        recipient = conversation.seller if conversation.buyer_id == self.request.user.id else conversation.buyer
        from notifications.models import Notification
        Notification.objects.create(
            user=recipient,
            kind=Notification.Kind.MESSAGE,
            title=f"New message from {self.request.user.full_name}",
            body=message.body[:180],
            data={"conversation_id": conversation.id, "message_id": message.id},
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user not in (instance.conversation.buyer, instance.conversation.seller):
            raise PermissionDenied("You are not a member of this conversation.")
        allowed = {"is_read"}
        data = {key: value for key, value in request.data.items() if key in allowed}
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
