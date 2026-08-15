from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .models import Recommendation, Review
from .serializers import RecommendationSerializer, ReviewSerializer
class ListingReviewsView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, listing_id):
        qs = Review.objects.select_related("reviewer", "listing").filter(listing_id=listing_id).order_by("-created_at")
        return Response(ReviewSerializer(qs, many=True).data)

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return Review.objects.select_related("reviewer", "listing").filter(reviewer=self.request.user) | Review.objects.select_related("reviewer", "listing").filter(order__seller=self.request.user)
    def perform_create(self, serializer):
        order = serializer.validated_data["order"]
        if order.buyer != self.request.user: raise ValidationError("Only the buyer can review an order.")
        if order.status != "completed": raise ValidationError("Only completed orders can be reviewed.")
        serializer.save(reviewer=self.request.user, listing=order.listing)
class RecommendationViewSet(viewsets.ModelViewSet):
    serializer_class = RecommendationSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return Recommendation.objects.filter(user=self.request.user)
    def perform_create(self, serializer): serializer.save(user=self.request.user)
