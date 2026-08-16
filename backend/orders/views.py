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
        listing = serializer.validated_data["listing"]
        # Snapshot the commercial terms now. Later listing-price edits must never
        # rewrite the value of an order that has already been placed.
        order = serializer.save(
            buyer=self.request.user,
            seller=listing.store.owner,
            store=listing.store,
            unit_price=(listing.offer_price if listing.is_on_offer and listing.offer_price is not None else listing.price) or 0,
            currency=listing.currency or "KES",
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
        valid_statuses = {choice for choice, _ in PurchaseRequest.Status.choices}
        if next_status not in valid_statuses:
            return Response({"detail": f"Unknown order status: {next_status}."}, status=400)

        # Buyers may only cancel a brand-new request. Sellers own the fulfilment
        # lifecycle and can only move an order forward one step at a time.
        if request.user == order.buyer:
            if next_status != "cancelled" or order.status != PurchaseRequest.Status.PENDING:
                return Response({"detail": "Buyers can only cancel a pending order."}, status=403)
        elif request.user != order.seller:
            return Response({"detail": "You do not have permission to change this order."}, status=403)
        else:
            allowed = {
                PurchaseRequest.Status.PENDING: {PurchaseRequest.Status.ACCEPTED, PurchaseRequest.Status.DECLINED},
                PurchaseRequest.Status.ACCEPTED: {PurchaseRequest.Status.PREPARING, PurchaseRequest.Status.CANCELLED},
                PurchaseRequest.Status.PREPARING: {PurchaseRequest.Status.READY, PurchaseRequest.Status.CANCELLED},
                PurchaseRequest.Status.READY: {PurchaseRequest.Status.COMPLETED, PurchaseRequest.Status.CANCELLED},
                PurchaseRequest.Status.COMPLETED: set(),
                PurchaseRequest.Status.DECLINED: set(),
                PurchaseRequest.Status.CANCELLED: set(),
            }
            if next_status not in allowed.get(order.status, set()):
                return Response({"detail": "Orders can only move to the next step. Previous or skipped steps are not allowed."}, status=400)

        with transaction.atomic():
            listing = order.listing.__class__.objects.select_for_update().get(pk=order.listing_id)
            if next_status == PurchaseRequest.Status.ACCEPTED:
                if not listing.is_available or listing.is_draft:
                    return Response({
                        "detail": "You cannot accept this order because this listing is currently out of stock or unavailable.",
                        "code": "OUT_OF_STOCK",
                        "available_stock": listing.stock or 0,
                        "requested_quantity": order.quantity,
                        "action": "RESTOCK",
                    }, status=400)
                if listing.stock and order.quantity > listing.stock:
                    return Response({
                        "detail": f"You cannot accept this order because only {listing.stock} item(s) remain in stock, but the order requests {order.quantity}.",
                        "code": "INSUFFICIENT_STOCK",
                        "available_stock": listing.stock,
                        "requested_quantity": order.quantity,
                        "action": "RESTOCK",
                    }, status=400)
                if listing.stock:
                    listing.stock -= order.quantity
                    if listing.stock == 0:
                        listing.is_available = False
                    listing.save(update_fields=["stock", "is_available", "updated_at"])
            elif next_status == PurchaseRequest.Status.CANCELLED and order.status in {PurchaseRequest.Status.ACCEPTED, PurchaseRequest.Status.PREPARING, PurchaseRequest.Status.READY} and listing.stock is not None:
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
