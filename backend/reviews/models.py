from django.conf import settings
from django.db import models
from catalog.models import Listing, Store
from orders.models import PurchaseRequest

class Review(models.Model):
    order = models.OneToOneField(PurchaseRequest, on_delete=models.CASCADE, related_name="review")
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_written")
    listing = models.ForeignKey(Listing, on_delete=models.PROTECT, related_name="reviews")
    rating = models.PositiveSmallIntegerField()
    text = models.TextField(blank=True)
    photo_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ["-created_at"]

class Recommendation(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recommendations")
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="recommendations")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "store"], name="unique_store_recommendation")]
