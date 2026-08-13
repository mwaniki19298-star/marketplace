from rest_framework import serializers
from .models import PurchaseRequest
from catalog.serializers import ListingSerializer, StoreSerializer
class PurchaseRequestSerializer(serializers.ModelSerializer):
    listing_detail = ListingSerializer(source="listing", read_only=True)
    store_detail = StoreSerializer(source="store", read_only=True)
    class Meta:
        model = PurchaseRequest
        fields = ["id", "buyer", "seller", "store", "listing", "listing_detail", "store_detail", "quantity", "message", "fulfillment", "status", "buyer_confirmed", "seller_confirmed", "created_at", "updated_at"]
        read_only_fields = ["buyer", "seller", "store", "status"]
