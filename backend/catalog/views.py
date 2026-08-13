from django.db.models import Q, Count
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify
import hashlib
import hmac
import time
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from core.permissions import IsOwnerOrReadOnly
from .models import Category, Listing, ListingLike, SavedItem, Store, StoreFollow
from .serializers import CategorySerializer, ListingSerializer, ListingWriteSerializer, SavedItemSerializer, StoreFollowSerializer, StoreSerializer, StoreProfileUpdateSerializer

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.select_related("owner").all()
    serializer_class = StoreSerializer
    permission_classes = [IsOwnerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    @action(detail=False, methods=["get", "patch"], permission_classes=[IsAuthenticated], url_path="mine")
    def mine(self, request):
        store = get_object_or_404(Store.objects.select_related("owner"), owner=request.user, is_active=True)
        if request.method == "GET":
            return Response(StoreSerializer(store, context={"request": request}).data)
        serializer = StoreProfileUpdateSerializer(store, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        store = serializer.save()
        return Response(StoreSerializer(store, context={"request": request}).data)
    search_fields = ["name", "description", "location"]
    ordering_fields = ["created_at", "name"]
    def perform_create(self, serializer): serializer.save(owner=self.request.user)
    @action(detail=True, methods=["post", "delete"], permission_classes=[IsAuthenticated])
    def follow(self, request, pk=None):
        store = self.get_object()
        obj = StoreFollow.objects.filter(user=request.user, store=store).first()
        if request.method == "POST":
            if not obj: obj = StoreFollow.objects.create(user=request.user, store=store)
            return Response(StoreFollowSerializer(obj).data, status=201)
        if obj: obj.delete()
        return Response(status=204)
    @action(detail=True, methods=["get"], permission_classes=[AllowAny])
    def listings(self, request, pk=None):
        store = self.get_object()
        return Response(ListingSerializer(store.listings.filter(is_available=True), many=True, context={"request": request}).data)

class ListingViewSet(viewsets.ModelViewSet):
    queryset = Listing.objects.select_related("store", "store__owner", "category").prefetch_related("images")
    filterset_fields = ["kind", "category", "store", "condition", "is_available", "is_featured", "location"]
    search_fields = ["title", "description", "tags", "store__name", "category__name"]
    ordering_fields = ["created_at", "price", "views", "title"]
    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ["list", "retrieve", "feed", "like"]:
            qs = qs.filter(is_draft=False)
            if not self.request.query_params.get("ordering"):
                qs = qs.order_by("-is_featured", "-created_at")
        elif self.action in ["update", "partial_update", "destroy", "save_item", "boost"]:
            qs = qs.filter(store__owner=self.request.user)
        return qs
    def get_permissions(self):
        return [AllowAny()] if self.action in ["list", "retrieve", "feed"] else [IsAuthenticated()]
    def get_serializer_class(self):
        return ListingSerializer if self.action in ["list", "retrieve"] else ListingWriteSerializer
    def perform_create(self, serializer):
        store = Store.objects.filter(owner=self.request.user, is_active=True).first()
        if not store:
            base_name = (self.request.user.full_name or self.request.user.email.split("@")[0] or "My").strip()
            name = f"{base_name}'s Store"
            base_slug = slugify(name) or f"store-{self.request.user.id}"
            slug = base_slug
            suffix = 2
            while Store.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{suffix}"
                suffix += 1
            store = Store.objects.create(
                owner=self.request.user,
                name=name,
                slug=slug,
            )
        serializer.save(store=store)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def mine(self, request):
        qs = self.get_queryset().filter(store__owner=request.user)
        return Response(ListingSerializer(qs, many=True, context={"request": request}).data)
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        Listing.objects.filter(pk=instance.pk).update(views=instance.views + 1)
        instance.views += 1
        return Response(ListingSerializer(instance, context={"request": request}).data)
    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def feed(self, request):
        qs = self.filter_queryset(self.get_queryset().filter(is_available=True))
        return Response(ListingSerializer(qs, many=True, context={"request": request}).data)
    @action(detail=True, methods=["post", "delete"], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        listing = self.get_object()
        item = ListingLike.objects.filter(user=request.user, listing=listing).first()
        if request.method == "POST":
            # Idempotent like: one account can have at most one like for a listing.
            # The database UniqueConstraint is the final safeguard; get_or_create also
            # makes repeated/rapid POSTs safe instead of creating duplicate likes.
            item, created = ListingLike.objects.get_or_create(
                user=request.user,
                listing=listing,
            )
            return Response({
                "liked": True,
                "created": created,
                "likes_count": listing.liked_by.count(),
            }, status=status.HTTP_200_OK)
        if item:
            item.delete()
        return Response({"liked": False, "likes_count": listing.liked_by.count()})

    @action(detail=True, methods=["post", "delete"], permission_classes=[IsAuthenticated])
    def save_item(self, request, pk=None):
        listing = self.get_object()
        item = SavedItem.objects.filter(user=request.user, listing=listing).first()
        if request.method == "POST":
            if not item: item = SavedItem.objects.create(user=request.user, listing=listing)
            return Response({"saved": True, "id": item.id}, status=201)
        if item: item.delete()
        return Response({"saved": False})
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def boost(self, request, pk=None):
        listing = self.get_object()
        enabled = request.data.get("enabled", True)
        if isinstance(enabled, str):
            enabled = enabled.lower() in {"1", "true", "yes", "on"}
        listing.is_featured = bool(enabled)
        listing.save(update_fields=["is_featured", "updated_at"])
        return Response({"id": listing.id, "is_featured": listing.is_featured})

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def saved(self, request):
        ids = SavedItem.objects.filter(user=request.user).values_list("listing_id", flat=True)
        return Response(ListingSerializer(self.get_queryset().filter(id__in=ids), many=True, context={"request": request}).data)


class CloudinarySignatureView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cloud_name = getattr(settings, "CLOUDINARY_CLOUD_NAME", "")
        api_key = getattr(settings, "CLOUDINARY_API_KEY", "")
        api_secret = getattr(settings, "CLOUDINARY_API_SECRET", "")
        if not all([cloud_name, api_key, api_secret]):
            return Response(
                {"detail": "Cloudinary is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Use Cloudinary's official signing helper so the signature exactly
        # matches the parameters sent by the mobile/web uploader.
        try:
            import cloudinary
            from cloudinary.utils import api_sign_request

            cloudinary.config(
                cloud_name=cloud_name,
                api_key=api_key,
                api_secret=api_secret,
                secure=True,
            )

            timestamp = int(time.time())
            upload_type = str(request.data.get("type", "listing")).strip().lower()
            allowed_types = {"listing", "avatar", "store_logo", "store_cover"}
            if upload_type not in allowed_types:
                upload_type = "listing"

            folders = {
                "listing": f"marketplace/listings/user_{request.user.id}",
                "avatar": f"marketplace/profiles/user_{request.user.id}",
                "store_logo": f"marketplace/stores/user_{request.user.id}/logo",
                "store_cover": f"marketplace/stores/user_{request.user.id}/cover",
            }
            folder = folders[upload_type]
            params = {"folder": folder, "timestamp": timestamp}
            signature = api_sign_request(params, api_secret)

            return Response({
                "cloud_name": cloud_name,
                "api_key": api_key,
                "timestamp": timestamp,
                "signature": signature,
                "folder": folder,
                "resource_type": "image",
            })
        except Exception as exc:
            # Don't expose the API secret, but return enough information to
            # diagnose a broken Cloudinary installation during development.
            return Response(
                {"detail": f"Cloudinary signing failed: {exc.__class__.__name__}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
