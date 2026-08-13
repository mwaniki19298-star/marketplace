from django.conf import settings
from django.db import models
class Notification(models.Model):
    class Kind(models.TextChoices):
        ORDER = "order", "Order"
        MESSAGE = "message", "Message"
        REVIEW = "review", "Review"
        STORE = "store", "Store"
        SYSTEM = "system", "System"
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.SYSTEM)
    title = models.CharField(max_length=200)
    body = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta: ordering = ["-created_at"]
