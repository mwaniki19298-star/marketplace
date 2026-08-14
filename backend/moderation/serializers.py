from rest_framework import serializers
from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = "__all__"
        read_only_fields = ["reporter", "status", "admin_notes", "created_at", "updated_at"]

    def validate(self, attrs):
        category = (attrs.get("category") or "").strip()
        reason = (attrs.get("reason") or "").strip()
        has_target = any([attrs.get("listing"), attrs.get("reported_user"), attrs.get("store"), attrs.get("order")])

        # A general support/problem report does not need a marketplace object target.
        if not has_target and not category:
            raise serializers.ValidationError({"category": "A problem category is required for a general support report."})
        if has_target and not reason:
            raise serializers.ValidationError({"reason": "A report reason is required."})
        if not reason:
            attrs["reason"] = category
        if attrs.get("reported_user") and attrs["reported_user"].pk == self.context["request"].user.pk:
            raise serializers.ValidationError({"reported_user": "You cannot report yourself."})
        return attrs
