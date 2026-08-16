from rest_framework import serializers
import base64
from django.utils.text import slugify
from .models import Category, Listing, ListingImage, ListingLike, SavedItem, Store, StoreFollow, StoreEmailVerification

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


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"

class ListingImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    def get_image(self, obj):
        # Seed-only rows keep the actual JPEG bytes inside SQLite.
        # Production/user uploads remain normal HTTPS Cloudinary URLs.
        if obj.seed_image_blob:
            encoded = base64.b64encode(bytes(obj.seed_image_blob)).decode("ascii")
            return f"data:image/jpeg;base64,{encoded}"
        return obj.image

    class Meta:
        model = ListingImage
        fields = ["id", "image", "public_id", "alt_text", "sort_order"]

class StoreSerializer(serializers.ModelSerializer):
    logo = serializers.SerializerMethodField()
    cover = serializers.SerializerMethodField()
    owner_name = serializers.CharField(source="owner.full_name", read_only=True)
    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    followers_count = serializers.SerializerMethodField()
    followed_by_user = serializers.SerializerMethodField()
    def get_logo(self, obj):
        return media_url(self.context.get("request"), obj.logo)

    def get_cover(self, obj):
        return media_url(self.context.get("request"), obj.cover)

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_followed_by_user(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.followers.filter(user=request.user).exists())

    email_verified = serializers.SerializerMethodField()

    def get_email_verified(self, obj):
        try:
            verification = obj.email_verification
        except StoreEmailVerification.DoesNotExist:
            verification = None
        return bool(verification and verification.verified_at)

    class Meta:
        model = Store
        fields = ["id", "owner", "owner_name", "owner_email", "name", "slug", "logo", "cover", "description", "location", "phone", "verification", "is_active", "email_verified", "followers_count", "followed_by_user", "created_at"]
        read_only_fields = ["owner"]

class StoreProfileUpdateSerializer(serializers.ModelSerializer):
    logo_url = serializers.URLField(write_only=True, required=False, allow_blank=True)
    cover_url = serializers.URLField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Store
        fields = ["name", "logo", "cover", "logo_url", "cover_url", "description", "location", "phone"]
        read_only_fields = ["logo", "cover"]

    def update(self, instance, validated_data):
        logo_url = validated_data.pop("logo_url", None)
        cover_url = validated_data.pop("cover_url", None)
        if logo_url is not None:
            instance.logo.name = logo_url or None
        if cover_url is not None:
            instance.cover.name = cover_url or None
        return super().update(instance, validated_data)

class ListingSerializer(serializers.ModelSerializer):
    store = StoreSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    saved_count = serializers.SerializerMethodField()
    liked_by_user = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    images = ListingImageSerializer(many=True, read_only=True)
    def get_likes_count(self, obj):
        return getattr(obj, "_likes_count", obj.liked_by.count())

    def get_saved_count(self, obj):
        return getattr(obj, "_saved_count", obj.saved_by.count())

    def get_liked_by_user(self, obj):
        request = self.context.get("request")
        cached = getattr(obj, "_liked_by_user", None)
        if cached is not None:
            return bool(cached)
        return bool(request and request.user.is_authenticated and ListingLike.objects.filter(listing=obj, user=request.user).exists())

    class Meta:
        model = Listing
        fields = ["id", "store", "category", "category_name", "kind", "title", "slug", "description", "price", "original_price", "offer_price", "is_on_offer", "currency", "negotiable", "condition", "stock", "location", "tags", "is_available", "is_featured", "is_draft", "views", "likes_count", "saved_count", "liked_by_user", "images", "created_at", "updated_at"]
        read_only_fields = ["views"]

class ListingWriteSerializer(serializers.ModelSerializer):
    original_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    offer_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    is_on_offer = serializers.BooleanField(required=False)

    image_urls = serializers.ListField(
        child=serializers.URLField(max_length=1200),
        write_only=True,
        required=False,
        allow_empty=True,
    )
    image_public_ids = serializers.ListField(
        child=serializers.CharField(max_length=512, allow_blank=True),
        write_only=True,
        required=False,
        allow_empty=True,
    )
    category_name = serializers.CharField(write_only=True, required=False, allow_blank=False)
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.filter(is_active=True),
        required=False,
    )

    class Meta:
        model = Listing
        exclude = ["store", "views"]
        read_only_fields = ["is_featured"]

    def validate(self, attrs):
        image_urls = attrs.get("image_urls")
        if image_urls is not None:
            for url in image_urls:
                if not url.startswith("https://res.cloudinary.com/"):
                    raise serializers.ValidationError({"image_urls": "Listing images must use HTTPS Cloudinary URLs."})
        is_on_offer = attrs.get("is_on_offer", getattr(self.instance, "is_on_offer", False))
        offer_price = attrs.get("offer_price", getattr(self.instance, "offer_price", None))
        price = attrs.get("price", getattr(self.instance, "price", None))
        if is_on_offer:
            if offer_price is None:
                raise serializers.ValidationError({"offer_price": "Add an offer price when marking a listing on offer."})
            if price is not None and offer_price >= price:
                raise serializers.ValidationError({"offer_price": "Offer price should be lower than the regular price."})
        return attrs

    def _resolve_category(self, validated_data):
        category = validated_data.get("category")
        category_name = validated_data.pop("category_name", "").strip()
        if category is not None:
            return category
        if not category_name:
            raise serializers.ValidationError({"category": "Choose a category."})
        slug = slugify(category_name) or "category"
        category = Category.objects.filter(name__iexact=category_name, is_active=True).first()
        if category is None:
            category = Category.objects.create(name=category_name[:100], slug=f"{slug}-{Category.objects.filter(slug__startswith=slug).count()+1}")
        validated_data["category"] = category
        return category

    def create(self, validated_data):
        image_urls = validated_data.pop("image_urls", [])
        image_public_ids = validated_data.pop("image_public_ids", [])
        if image_public_ids and len(image_public_ids) != len(image_urls):
            raise serializers.ValidationError({"image_public_ids": "Provide one public_id for each image URL."})
        self._resolve_category(validated_data)
        listing = super().create(validated_data)
        for index, url in enumerate(image_urls[:8]):
            ListingImage.objects.create(
                listing=listing,
                image=url,
                public_id=image_public_ids[index] if index < len(image_public_ids) else "",
                sort_order=index,
            )
        return listing

    def update(self, instance, validated_data):
        image_urls = validated_data.pop("image_urls", None)
        image_public_ids = validated_data.pop("image_public_ids", None)
        if image_urls is not None:
            if image_public_ids is not None and len(image_public_ids) != len(image_urls):
                raise serializers.ValidationError({"image_public_ids": "Provide one public_id for each image URL."})
        if "category_name" in validated_data or "category" in validated_data:
            self._resolve_category(validated_data)

        # Offer pricing is persisted on the Listing itself. Keep the regular
        # price as the base price and never replace it with the offer price.
        if "price" in validated_data and "original_price" not in validated_data:
            validated_data["original_price"] = validated_data["price"]
        if validated_data.get("is_on_offer") is False:
            validated_data["offer_price"] = None
        elif validated_data.get("is_on_offer") is True and "offer_price" not in validated_data:
            validated_data["offer_price"] = instance.offer_price

        listing = super().update(instance, validated_data)
        if image_urls is not None:
            listing.images.all().delete()
            for index, url in enumerate(image_urls[:8]):
                ListingImage.objects.create(
                    listing=listing,
                    image=url,
                    public_id=(image_public_ids[index] if image_public_ids is not None and index < len(image_public_ids) else ""),
                    sort_order=index,
                )
        # Explicit save makes the offer fields durable even when the PATCH only
        # changes pricing/offer state and gives callers the latest DB values.
        listing.save(update_fields=["price", "original_price", "offer_price", "is_on_offer", "updated_at"])
        return listing

class SavedItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedItem
        fields = ["id", "listing", "created_at"]
        read_only_fields = ["user"]

class StoreFollowSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreFollow
        fields = ["id", "store", "created_at"]
        read_only_fields = ["user"]
