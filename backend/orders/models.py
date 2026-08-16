from django.conf import settings
from django.db import models
from catalog.models import Listing, Store

class PurchaseRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        PREPARING = "preparing", "Preparing"
        READY = "ready", "Ready"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="purchase_requests")
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="incoming_purchase_requests")
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name="purchase_requests")
    listing = models.ForeignKey(Listing, on_delete=models.PROTECT, related_name="purchase_requests")
    quantity = models.PositiveIntegerField(default=1)
    # Immutable commercial snapshot: price/currency at the moment the order was placed.
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="KES")
    message = models.TextField(blank=True)
    fulfillment = models.CharField(max_length=30, default="pickup")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    buyer_confirmed = models.BooleanField(default=False)
    seller_confirmed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ["-created_at"]
