from django.conf import settings
from django.db import models
from catalog.models import Store, Listing

class Conversation(models.Model):
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="buyer_conversations")
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="seller_conversations")
    store = models.ForeignKey(Store, on_delete=models.SET_NULL, null=True, blank=True, related_name="conversations")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Timestamps used to power the "<user> is typing..." indicator. Updated by the
    # /api/conversations/<id>/typing/ endpoint and considered stale after
    # TYPING_TIMEOUT_SECONDS (see serializers.py / views.py) so a client that
    # stops sending typing pings automatically clears the indicator.
    buyer_typing_at = models.DateTimeField(null=True, blank=True)
    seller_typing_at = models.DateTimeField(null=True, blank=True)
    class Meta: ordering = ["-updated_at"]

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="messages_sent")
    body = models.TextField()
    attachment = models.FileField(upload_to="messages/", blank=True, null=True)
    listing = models.ForeignKey(Listing, on_delete=models.SET_NULL, null=True, blank=True, related_name="messages")
    product_snapshot = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta: ordering = ["created_at"]
