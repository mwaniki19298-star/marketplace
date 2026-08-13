from django.conf import settings
from django.db import models
from catalog.models import Listing, Store
from orders.models import PurchaseRequest
class Report(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        REVIEWING = "reviewing", "Reviewing"
        RESOLVED = "resolved", "Resolved"
        REJECTED = "rejected", "Rejected"
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports")
    listing = models.ForeignKey(Listing, on_delete=models.SET_NULL, null=True, blank=True, related_name="reports")
    store = models.ForeignKey(Store, on_delete=models.SET_NULL, null=True, blank=True, related_name="reports")
    order = models.ForeignKey(PurchaseRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name="reports")
    reason = models.CharField(max_length=100)
    description = models.TextField()
    evidence = models.FileField(upload_to="reports/", blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
