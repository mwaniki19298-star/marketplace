from django.conf import settings
from django.db import models

class Timestamped(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True

class Category(Timestamped):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    def __str__(self): return self.name

class Store(Timestamped):
    class Verification(models.TextChoices):
        NEW = "new", "New Seller"
        IDENTITY = "identity", "Verified Identity"
        COMMUNITY = "community", "Verified Community Member"
        TRUSTED = "trusted", "Trusted Seller"
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="stores")
    name = models.CharField(max_length=160)
    slug = models.SlugField(unique=True)
    logo = models.ImageField(upload_to="stores/logos/", blank=True, null=True)
    cover = models.ImageField(upload_to="stores/covers/", blank=True, null=True)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=160, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    verification = models.CharField(max_length=20, choices=Verification.choices, default=Verification.NEW)
    is_active = models.BooleanField(default=True)
    def __str__(self): return self.name

class StoreEmailVerification(Timestamped):
    store = models.OneToOneField(Store, on_delete=models.CASCADE, related_name="email_verification")
    code_hash = models.CharField(max_length=128, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    last_sent_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)

    @property
    def is_verified(self):
        return bool(self.verified_at)


class Listing(Timestamped):
    class Kind(models.TextChoices):
        PRODUCT = "product", "Product"
        SERVICE = "service", "Service"
    class Condition(models.TextChoices):
        NEW = "new", "New"
        USED = "used", "Used"
        REFURBISHED = "refurbished", "Refurbished"
        NOT_APPLICABLE = "na", "Not applicable"
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="listings")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="listings")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.PRODUCT)
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    original_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    offer_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    is_on_offer = models.BooleanField(default=False)
    currency = models.CharField(max_length=3, default="KES")
    negotiable = models.BooleanField(default=False)
    condition = models.CharField(max_length=20, choices=Condition.choices, default=Condition.NEW)
    stock = models.PositiveIntegerField(default=1)
    location = models.CharField(max_length=160, blank=True)
    tags = models.JSONField(default=list, blank=True)
    is_available = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_draft = models.BooleanField(default=False)
    views = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["kind", "is_available"]),
            models.Index(fields=["category", "is_available"]),
            models.Index(fields=["store", "is_available"]),
        ]

    @property
    def owner(self): return self.store.owner
    def __str__(self): return self.title

class ListingImage(Timestamped):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="images")
    image = models.URLField(max_length=1200)
    public_id = models.CharField(max_length=512, blank=True)
    # Seed-only image storage. Normal/mobile uploads continue to use the URL + Cloudinary public_id.
    seed_image_blob = models.BinaryField(null=True, blank=True, editable=False)
    alt_text = models.CharField(max_length=200, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    class Meta: ordering = ("sort_order", "id")

class SavedItem(Timestamped):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_items")
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="saved_by")
    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "listing"], name="unique_saved_item")]

class CartItem(Timestamped):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cart_items")
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="cart_items")
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "listing"], name="unique_cart_item")]
        indexes = [models.Index(fields=["user", "created_at"]), models.Index(fields=["listing", "created_at"])]


class StoreFollow(Timestamped):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="store_follows")
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="followers")
    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "store"], name="unique_store_follow")]


class ListingLike(Timestamped):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="listing_likes")
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="liked_by")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "listing"], name="unique_listing_like")]
        indexes = [models.Index(fields=["listing", "created_at"])]


class MarketplaceEvent(Timestamped):
    class EventType(models.TextChoices):
        VIEW = "view", "View"
        LIKE = "like", "Like"
        UNLIKE = "unlike", "Unlike"
        SAVE = "save", "Save"
        UNSAVE = "unsave", "Unsave"
        SHARE = "share", "Share"
        SEARCH = "search", "Search"
        CLICK = "click", "Click"
        CART_ADD = "cart_add", "Cart add"
        PURCHASE = "purchase", "Purchase"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="marketplace_events")
    event = models.CharField(max_length=20, choices=EventType.choices)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, null=True, blank=True, related_name="marketplace_events")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="marketplace_events")
    store = models.ForeignKey(Store, on_delete=models.SET_NULL, null=True, blank=True, related_name="marketplace_events")
    query = models.CharField(max_length=200, blank=True)
    value = models.FloatField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "event", "created_at"]),
            models.Index(fields=["user", "listing", "created_at"]),
            models.Index(fields=["user", "category", "created_at"]),
            models.Index(fields=["user", "store", "created_at"]),
            models.Index(fields=["event", "created_at"]),
        ]
