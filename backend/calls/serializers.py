from rest_framework import serializers
from .models import Call


class CallSerializer(serializers.ModelSerializer):
    class Meta:
        model = Call
        fields = [
            "id", "conversation", "caller", "receiver", "status",
            "offer", "answer", "ice_candidates", "created_at", "updated_at",
        ]
        read_only_fields = fields
