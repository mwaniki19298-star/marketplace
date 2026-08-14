from django.db import transaction
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import PurchaseRequest
from .serializers import PurchaseRequestSerializer
from notifications.models import Notification


def create_order_notification(user, title, body, order):
    Notification.objects.create(
        user=user,
        kind=Notification.Kind.ORDER,
        title=title,
        body=body,
        data={"order_id": order.id, "listing_id": order.listing_id},
    )


class PurchaseRequestViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return PurchaseRequest.objects.select_related("listing", "store", "buyer", "seller").filter(
            buyer=user
        ) | PurchaseRequest.objects.select_related("listing", "store", "buyer", "seller").filter(
            seller=user
        )

    def perform_create(self, serializer):
        order = serializer.save(
            buyer=self.request.user,
            seller=serializer.validated_data["listing"].store.owner,
            store=serializer.validated_data["listing"].store,
        )
        create_order_notification(
            order.seller,
            "New purchase request",
            f"{order.buyer.full_name} requested {order.quantity} × {order.listing.title}.",
            order,
        )
        create_order_notification(
            order.buyer,
            "Purchase request sent",
            f"Your request for {order.listing.title} was sent to the seller.",
            order,
        )

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        order = self.get_object()
        next_status = request.data.get("status")
        allowed = {
            "pending": {"accepted", "declined", "cancelled"},
            "accepted": {"preparing", "cancelled"},
            "preparing": {"ready"},
            "ready": {"completed"},
        }
        if next_status not in allowed.get(order.status, set()):
            return Response({"detail": f"Cannot change {order.status} to {next_status}."}, status=400)
        if request.user == order.buyer and next_status in {"accepted", "preparing", "ready", "declined"}:
            return Response({"detail": "Only the seller can progress this order."}, status=403)
        if request.user == order.seller and next_status == "cancelled":
            pass
        if request.user == order.buyer and next_status == "cancelled" and order.status != "pending":
            return Response({"detail": "You can only cancel a pending request."}, status=403)

        with transaction.atomic():
            listing = order.listing.__class__.objects.select_for_update().get(pk=order.listing_id)
            if next_status == "accepted":
                if not listing.is_available or listing.is_draft:
                    return Response({"detail": "This listing is no longer available."}, status=400)
                if listing.stock and order.quantity > listing.stock:
                    return Response({"detail": f"Only {listing.stock} item(s) remain available."}, status=400)
                if listing.stock:
                    listing.stock -= order.quantity
                    if listing.stock == 0:
                        listing.is_available = False
                    listing.save(update_fields=["stock", "is_available", "updated_at"])
            elif next_status == "cancelled" and order.status in {"accepted", "preparing"} and listing.stock is not None:
                listing.stock += order.quantity
                listing.is_available = True
                listing.save(update_fields=["stock", "is_available", "updated_at"])
            order.status = next_status
            order.save(update_fields=["status", "updated_at"])

        status_label = order.get_status_display()
        create_order_notification(
            order.buyer if request.user == order.seller else order.seller,
            "Order updated",
            f"Order #{order.id} for {order.listing.title} is now {status_label.lower()}.",
            order,
        )
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"])
    def confirm_received(self, request, pk=None):
        order = self.get_object()
        if request.user != order.buyer:
            return Response({"detail": "Only the buyer can confirm receipt."}, status=403)
        if order.status not in {"ready", "completed"}:
            return Response({"detail": "The order must be ready before you confirm receipt."}, status=400)
        order.buyer_confirmed = True
        if order.seller_confirmed or order.status == PurchaseRequest.Status.READY:
            order.status = PurchaseRequest.Status.COMPLETED
        order.save(update_fields=["buyer_confirmed", "status", "updated_at"])
        create_order_notification(
            order.seller,
            "Buyer confirmed receipt",
            f"The buyer confirmed receipt of {order.listing.title}.",
            order,
        )
        return Response(self.get_serializer(order).data)
