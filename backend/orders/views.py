from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import PurchaseRequest
from .serializers import PurchaseRequestSerializer
class PurchaseRequestViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseRequestSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        user = self.request.user
        return PurchaseRequest.objects.select_related("listing", "store", "buyer", "seller").filter(buyer=user) | PurchaseRequest.objects.select_related("listing", "store", "buyer", "seller").filter(seller=user)
    def perform_create(self, serializer):
        listing = serializer.validated_data["listing"]
        serializer.save(buyer=self.request.user, seller=listing.store.owner, store=listing.store)
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
        order.status = next_status
        order.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(order).data)
    @action(detail=True, methods=["post"])
    def confirm_received(self, request, pk=None):
        order = self.get_object()
        if request.user != order.buyer: return Response({"detail": "Only the buyer can confirm receipt."}, status=403)
        order.buyer_confirmed = True
        if order.seller_confirmed or order.status == PurchaseRequest.Status.READY:
            order.status = PurchaseRequest.Status.COMPLETED
        order.save(update_fields=["buyer_confirmed", "status", "updated_at"])
        return Response(self.get_serializer(order).data)
