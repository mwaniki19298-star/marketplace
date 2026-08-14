from rest_framework import serializers
from .models import PurchaseRequest
from catalog.serializers import ListingSerializer, StoreSerializer
class PurchaseRequestSerializer(serializers.ModelSerializer):
    listing_detail = ListingSerializer(source="listing", read_only=True)
    store_detail = StoreSerializer(source="store", read_only=True)
    def validate(self, attrs):
        request = self.context["request"]
        listing = attrs.get("listing")
        quantity = attrs.get("quantity", 1)
        if listing is None:
            raise serializers.ValidationError({"listing": "Choose a listing."})
        if listing.store.owner_id == request.user.id:
            raise serializers.ValidationError({"listing": "You cannot purchase your own listing."})
        if listing.is_draft or not listing.is_available:
            raise serializers.ValidationError({"listing": "This listing is no longer available."})
        if quantity < 1:
            raise serializers.ValidationError({"quantity": "Quantity must be at least 1."})
        if listing.stock and quantity > listing.stock:
            raise serializers.ValidationError({"quantity": f"Only {listing.stock} item(s) are available."})
        return attrs

    class Meta:
        model = PurchaseRequest
        fields = ["id", "buyer", "seller", "store", "listing", "listing_detail", "store_detail", "quantity", "message", "fulfillment", "status", "buyer_confirmed", "seller_confirmed", "created_at", "updated_at"]
        read_only_fields = ["buyer", "seller", "store", "status"]
