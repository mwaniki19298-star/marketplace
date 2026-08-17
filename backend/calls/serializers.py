from django.utils import timezone
from rest_framework import serializers
from .models import Call


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


class CallSerializer(serializers.ModelSerializer):
    caller_name = serializers.CharField(source="caller.full_name", read_only=True)
    receiver_name = serializers.CharField(source="receiver.full_name", read_only=True)
    caller_avatar = serializers.SerializerMethodField()
    receiver_avatar = serializers.SerializerMethodField()
    duration_seconds = serializers.SerializerMethodField()

    def get_caller_avatar(self, obj):
        return media_url(self.context.get("request"), obj.caller.avatar)

    def get_receiver_avatar(self, obj):
        return media_url(self.context.get("request"), obj.receiver.avatar)

    def get_duration_seconds(self, obj):
        if not obj.accepted_at:
            return 0
        end = obj.ended_at or timezone.now()
        return max(0, int((end - obj.accepted_at).total_seconds()))

    class Meta:
        model = Call
        fields = [
            "id", "conversation", "caller", "receiver", "caller_name", "receiver_name",
            "caller_avatar", "receiver_avatar", "status", "offer", "answer", "ice_candidates",
            "created_at", "accepted_at", "ended_at", "duration_seconds",
        ]
        read_only_fields = fields
