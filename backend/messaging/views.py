from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer


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

        conversation, _ = Conversation.objects.get_or_create(
            buyer=request.user, seller=seller, store=store
        )
        serializer = self.get_serializer(conversation)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            Message.objects
            .filter(Q(conversation__buyer=self.request.user) | Q(conversation__seller=self.request.user))
            .select_related("sender", "conversation")
            .order_by("created_at")
        )
        conversation_id = self.request.query_params.get("conversation")
        if conversation_id:
            queryset = queryset.filter(conversation_id=conversation_id)
        return queryset

    def perform_create(self, serializer):
        conversation = serializer.validated_data["conversation"]
        if self.request.user not in (conversation.buyer, conversation.seller):
            raise PermissionDenied("You are not a member of this conversation.")
        message = serializer.save(sender=self.request.user)
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
