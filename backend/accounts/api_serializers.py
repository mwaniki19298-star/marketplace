from rest_framework import serializers
from .models import UserPreferences, NotificationPreferences


DEFAULT_SETTINGS = {
    "theme": "system",
    "language": "English",
    "region": "Kenya",
    "currency": "KES",
    "preferredBuyingLocation": "Kenya",
    "fulfillment": "Both",
    "recommendations": True,
    "recentlyViewed": True,
    "recommendedListings": True,
    "autoplay": True,
    "highQuality": True,
    "dataSaver": False,
    "confirmDelete": True,
    "confirmSignOut": True,
    "profileVisibility": True,
    "contact": True,
    "activity": True,
    "sharing": False,
}

DEFAULT_NOTIFICATION_SETTINGS = {
    "allow": True,
    "sound": True,
    "vibration": True,
    "messages": True,
    "purchases": True,
    "orders": True,
    "listings": True,
    "saved": True,
    "seller": True,
    "security": True,
    "account": True,
    "promotions": False,
    "recommendations": True,
    "offers": False,
    "quiet": False,
    "quietStart": "22:00",
    "quietEnd": "07:00",
}


class PreferencesSerializer(serializers.ModelSerializer):
    settings = serializers.JSONField()

    class Meta:
        model = UserPreferences
        fields = ["settings", "updated_at"]
        read_only_fields = ["updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        merged = {**DEFAULT_SETTINGS, **(instance.settings or {})}
        data["settings"] = merged
        return data


class NotificationPreferencesSerializer(serializers.ModelSerializer):
    settings = serializers.JSONField()

    class Meta:
        model = NotificationPreferences
        fields = ["settings", "updated_at"]
        read_only_fields = ["updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["settings"] = {**DEFAULT_NOTIFICATION_SETTINGS, **(instance.settings or {})}
        return data
