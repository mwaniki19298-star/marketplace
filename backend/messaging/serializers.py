from django.utils import timezone
from rest_framework import serializers
from .models import Conversation, Message
from catalog.models import Listing

# A typing ping older than this is considered stale and the indicator is hidden.
# Clients should re-send a ping roughly every 2-3s while the user is actively typing.
TYPING_TIMEOUT_SECONDS = 6


def media_url(request, value):
    if not value:
        return None
    raw = str(value)
    if raw.startswith(("http://", "https://")):
        return raw
    if request is not None:
        try:
            return request.build_absolute_uri(raw if raw.startswith("/") else f"/media/{raw}")
        except Exception:
            pass
    return raw


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    sender_avatar = serializers.SerializerMethodField()
    listing = serializers.PrimaryKeyRelatedField(queryset=Listing.objects.all(), required=False, allow_null=True)

    def get_sender_avatar(self, obj):
        return media_url(self.context.get("request"), obj.sender.avatar)

    def validate(self, attrs):
        conversation = attrs.get("conversation")
        listing = attrs.get("listing")
        if listing is not None and conversation is not None:
            if listing.store_id and listing.store.owner_id != conversation.seller_id:
                raise serializers.ValidationError({"listing": "This listing does not belong to the seller in this conversation."})
        return attrs

    class Meta:
        model = Message
        fields = ["id", "conversation", "sender", "sender_name", "sender_avatar", "body", "attachment", "listing", "product_snapshot", "is_read", "created_at"]
        read_only_fields = ["sender", "product_snapshot"]


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    buyer_name = serializers.CharField(source="buyer.full_name", read_only=True)
    seller_name = serializers.CharField(source="seller.full_name", read_only=True)
    buyer_avatar = serializers.SerializerMethodField()
    seller_avatar = serializers.SerializerMethodField()
    store_name = serializers.CharField(source="store.name", read_only=True, allow_null=True)
    store_logo = serializers.SerializerMethodField()
    store_verified = serializers.SerializerMethodField()
    store_phone = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    other_typing = serializers.SerializerMethodField()

    def get_buyer_avatar(self, obj):
        return media_url(self.context.get("request"), obj.buyer.avatar)

    def get_seller_avatar(self, obj):
        return media_url(self.context.get("request"), obj.seller.avatar)

    def get_store_logo(self, obj):
        return media_url(self.context.get("request"), obj.store.logo if obj.store else None)

    def get_store_phone(self, obj):
        # Seller's saved contact number for this conversation's store (already
        # shown publicly on the store profile page). Used by the chat header's
        # WhatsApp/Call actions; the buyer currently has no saved phone number
        # in the data model, so this is only ever populated for the seller side.
        return obj.store.phone if obj.store and obj.store.phone else None

    def get_store_verified(self, obj):
        if not obj.store:
            return False
        try:
            verification = obj.store.email_verification
        except Exception:
            return False
        return bool(verification and verification.verified_at)

    def get_last_message(self, obj):
        message = obj.messages.order_by("-created_at").first()
        if not message:
            return None
        return {
            "id": message.id,
            "sender": message.sender_id,
            "sender_name": message.sender.full_name or message.sender.email,
            "body": message.body,
            "created_at": message.created_at,
        }

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0
        return obj.messages.filter(is_read=False).exclude(sender=request.user).count()

    def get_other_typing(self, obj):
        """True when the *other* participant in the conversation has pinged
        the typing endpoint within the last TYPING_TIMEOUT_SECONDS seconds."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if request.user.id == obj.buyer_id:
            typing_at = obj.seller_typing_at
        elif request.user.id == obj.seller_id:
            typing_at = obj.buyer_typing_at
        else:
            return False
        if not typing_at:
            return False
        return (timezone.now() - typing_at).total_seconds() < TYPING_TIMEOUT_SECONDS

    class Meta:
        model = Conversation
        fields = [
            "id", "buyer", "seller", "buyer_name", "seller_name", "buyer_avatar", "seller_avatar",
            "store", "store_name", "store_logo", "store_verified", "store_phone", "messages", "last_message", "unread_count",
            "other_typing", "created_at", "updated_at"
        ]
        read_only_fields = ["buyer", "seller"]
