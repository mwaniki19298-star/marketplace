from rest_framework import serializers
from .models import Recommendation, Review
class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source="reviewer.full_name", read_only=True)
    class Meta:
        model = Review
        fields = ["id", "order", "reviewer", "reviewer_name", "listing", "rating", "text", "photo_url", "created_at"]
        read_only_fields = ["reviewer"]
    def validate_rating(self, value):
        if not 1 <= value <= 5: raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
class RecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recommendation
        fields = ["id", "user", "store", "created_at"]
        read_only_fields = ["user"]
