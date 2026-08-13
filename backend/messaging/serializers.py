from rest_framework import serializers
from .models import Conversation, Message


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

    def get_sender_avatar(self, obj):
        return media_url(self.context.get("request"), obj.sender.avatar)

    class Meta:
        model = Message
        fields = ["id", "conversation", "sender", "sender_name", "sender_avatar", "body", "attachment", "is_read", "created_at"]
        read_only_fields = ["sender"]


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    buyer_name = serializers.CharField(source="buyer.full_name", read_only=True)
    seller_name = serializers.CharField(source="seller.full_name", read_only=True)
    buyer_avatar = serializers.SerializerMethodField()
    seller_avatar = serializers.SerializerMethodField()
    store_name = serializers.CharField(source="store.name", read_only=True, allow_null=True)
    store_logo = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    def get_buyer_avatar(self, obj):
        return media_url(self.context.get("request"), obj.buyer.avatar)

    def get_seller_avatar(self, obj):
        return media_url(self.context.get("request"), obj.seller.avatar)

    def get_store_logo(self, obj):
        return media_url(self.context.get("request"), obj.store.logo if obj.store else None)

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

    class Meta:
        model = Conversation
        fields = [
            "id", "buyer", "seller", "buyer_name", "seller_name", "buyer_avatar", "seller_avatar",
            "store", "store_name", "store_logo", "messages", "last_message", "unread_count",
            "created_at", "updated_at"
        ]
        read_only_fields = ["buyer", "seller"]
