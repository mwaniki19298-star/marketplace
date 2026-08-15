from django.db import transaction
from rest_framework import serializers, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CartItem, Listing, MarketplaceEvent
from .serializers import ListingSerializer
from notifications.models import Notification
import logging

logger = logging.getLogger(__name__)


class CartItemSerializer(serializers.ModelSerializer):
    listing_detail = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "listing", "listing_detail", "quantity", "line_total", "created_at", "updated_at"]
        read_only_fields = ["user", "listing_detail", "line_total", "created_at", "updated_at"]

    def get_listing_detail(self, obj):
        return ListingSerializer(obj.listing, context=self.context).data

    def get_line_total(self, obj):
        price = obj.listing.offer_price if obj.listing.is_on_offer and obj.listing.offer_price is not None else obj.listing.price
        return float(price or 0) * obj.quantity


class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return CartItem.objects.select_related(
            "listing", "listing__store", "listing__store__owner", "listing__category"
        ).prefetch_related("listing__images").filter(user=self.request.user)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        try:
            listing_id = int(request.data.get("listing"))
            quantity = int(request.data.get("quantity", 1))
        except (TypeError, ValueError):
            return Response({"detail": "A valid listing and quantity are required."}, status=status.HTTP_400_BAD_REQUEST)

        if quantity < 1:
            return Response({"detail": "Quantity must be at least 1."}, status=status.HTTP_400_BAD_REQUEST)

        logger.info("CART ADD user=%s listing_id=%s quantity=%s", request.user.id, listing_id, quantity)
        listing = Listing.objects.select_for_update().select_related("store", "category").filter(
            pk=listing_id, is_draft=False, is_available=True, store__is_active=True
        ).first()
        if not listing:
            logger.warning("CART ADD NOT FOUND user=%s listing_id=%s", request.user.id, listing_id)
            return Response({"detail": "This product is no longer available or its store is inactive."}, status=status.HTTP_404_NOT_FOUND)
        if listing.stock <= 0:
            return Response({"detail": "This product is out of stock."}, status=status.HTTP_400_BAD_REQUEST)

        item, created = CartItem.objects.select_for_update().get_or_create(
            user=request.user, listing=listing, defaults={"quantity": 0}
        )
        next_quantity = item.quantity + quantity
        if next_quantity > listing.stock:
            return Response(
                {"detail": f"Only {listing.stock} item(s) are available. Your cart already has {item.quantity}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        item.quantity = next_quantity
        item.save(update_fields=["quantity", "updated_at"])
        MarketplaceEvent.objects.create(user=request.user, event=MarketplaceEvent.EventType.CART_ADD, listing=listing, category=listing.category, store=listing.store, value=quantity)
        if listing.store.owner_id != request.user.id:
            Notification.objects.create(
                user=listing.store.owner,
                kind=Notification.Kind.STORE,
                title="Product added to cart",
                body=f"{request.user.full_name} added {listing.title} to their cart.",
                data={"listing_id": listing.id, "store_id": listing.store_id},
            )
        logger.info("CART ADD SUCCESS user=%s listing_id=%s cart_item=%s quantity=%s", request.user.id, listing.id, item.id, item.quantity)
        return Response(self.get_serializer(item).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        item = self.get_object()
        try:
            quantity = int(request.data.get("quantity"))
        except (TypeError, ValueError):
            return Response({"detail": "Quantity must be a whole number."}, status=status.HTTP_400_BAD_REQUEST)
        if quantity < 1:
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        listing = Listing.objects.select_for_update().get(pk=item.listing_id)
        if quantity > listing.stock:
            return Response({"detail": f"Only {listing.stock} item(s) are available."}, status=status.HTTP_400_BAD_REQUEST)
        item.quantity = quantity
        item.save(update_fields=["quantity", "updated_at"])
        return Response(self.get_serializer(item).data)
