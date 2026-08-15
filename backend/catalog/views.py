from datetime import timedelta
import random
from django.db.models import Q, Count, Avg, Sum, Case, When, Value, FloatField
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify
import hashlib
import hmac
import time
import secrets
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from core.permissions import IsOwnerOrReadOnly
from .models import Category, Listing, ListingLike, SavedItem, Store, StoreFollow, MarketplaceEvent, StoreEmailVerification
from .serializers import CategorySerializer, ListingSerializer, ListingWriteSerializer, SavedItemSerializer, StoreFollowSerializer, StoreSerializer, StoreProfileUpdateSerializer


def _mask_email(email):
    value = str(email or "").strip()
    if "@" not in value:
        return value
    local, domain = value.split("@", 1)
    if len(local) <= 2:
        masked = local[:1] + "*" * max(1, len(local) - 1)
    else:
        masked = local[:2] + "*" * max(2, len(local) - 2)
    return f"{masked}@{domain}"

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.select_related("owner").all()
    serializer_class = StoreSerializer
    permission_classes = [IsOwnerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

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
    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated], url_path="verification-status")
    def verification_status(self, request):
        store = get_object_or_404(Store.objects.select_related("owner"), owner=request.user, is_active=True)
        verification, _ = StoreEmailVerification.objects.get_or_create(store=store)
        return Response({
            "verified": bool(verification.verified_at),
            "email": request.user.email,
            "email_masked": _mask_email(request.user.email),
            "can_resend": not verification.last_sent_at or (timezone.now() - verification.last_sent_at).total_seconds() >= 60,
        })

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated], url_path="send-verification")
    def send_verification(self, request):
        store = get_object_or_404(Store.objects.select_related("owner"), owner=request.user, is_active=True)
        verification, _ = StoreEmailVerification.objects.get_or_create(store=store)
        now = timezone.now()
        if verification.verified_at:
            return Response({"verified": True, "detail": "Store email is already verified."})
        if verification.last_sent_at and (now - verification.last_sent_at).total_seconds() < 60:
            remaining = max(1, 60 - int((now - verification.last_sent_at).total_seconds()))
            return Response({"detail": f"Please wait {remaining} seconds before requesting another code."}, status=429)
        code = f"{secrets.randbelow(1_000_000):06d}"
        verification.code_hash = hashlib.sha256(code.encode()).hexdigest()
        verification.expires_at = now + timedelta(minutes=10)
        verification.last_sent_at = now
        verification.attempts = 0
        verification.save(update_fields=["code_hash", "expires_at", "last_sent_at", "attempts", "updated_at"])
        try:
            send_mail(
                "Marketplace store verification code",
                f"Your Marketplace store verification code is {code}. It expires in 10 minutes. If you did not request this, you can ignore this email.",
                None,
                [request.user.email],
                fail_silently=False,
            )
        except Exception:
            verification.code_hash = ""
            verification.expires_at = None
            verification.last_sent_at = None
            verification.save(update_fields=["code_hash", "expires_at", "last_sent_at", "updated_at"])
            return Response({"detail": "We could not send the verification email. Please try again later."}, status=503)
        return Response({"verified": False, "sent": True, "email_masked": _mask_email(request.user.email), "detail": "Verification code sent."})

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated], url_path="confirm-verification")
    def confirm_verification(self, request):
        store = get_object_or_404(Store.objects.select_related("owner"), owner=request.user, is_active=True)
        verification, _ = StoreEmailVerification.objects.get_or_create(store=store)
        if verification.verified_at:
            return Response({"verified": True, "detail": "Store email is already verified."})
        code = str(request.data.get("code", "")).strip()
        if not code or not code.isdigit() or len(code) != 6:
            return Response({"detail": "Enter the 6-digit verification code."}, status=400)
        if verification.expires_at is None or timezone.now() > verification.expires_at:
            return Response({"detail": "This verification code has expired. Request a new code."}, status=400)
        if verification.attempts >= 5:
            return Response({"detail": "Too many incorrect attempts. Request a new code."}, status=429)
        expected = verification.code_hash or ""
        actual = hashlib.sha256(code.encode()).hexdigest()
        if not hmac.compare_digest(expected, actual):
            verification.attempts += 1
            verification.save(update_fields=["attempts", "updated_at"])
            return Response({"detail": "Incorrect verification code."}, status=400)
        verification.verified_at = timezone.now()
        verification.code_hash = ""
        verification.expires_at = None
        verification.save(update_fields=["verified_at", "code_hash", "expires_at", "updated_at"])
        return Response({"verified": True, "detail": "Store email verified successfully."})

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
        if request.user.is_authenticated:
            MarketplaceEvent.objects.create(
                user=request.user, event=MarketplaceEvent.EventType.VIEW,
                listing=instance, category=instance.category, store=instance.store,
                value=float(instance.price) if instance.price is not None else None,
            )
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
            if created:
                MarketplaceEvent.objects.create(user=request.user, event=MarketplaceEvent.EventType.LIKE, listing=listing, category=listing.category, store=listing.store)
            return Response({
                "liked": True,
                "created": created,
                "likes_count": listing.liked_by.count(),
            }, status=status.HTTP_200_OK)
        if item:
            item.delete()
            MarketplaceEvent.objects.create(user=request.user, event=MarketplaceEvent.EventType.UNLIKE, listing=listing, category=listing.category, store=listing.store)
        return Response({"liked": False, "likes_count": listing.liked_by.count()})

    @action(detail=True, methods=["post", "delete"], permission_classes=[IsAuthenticated])
    def save_item(self, request, pk=None):
        listing = self.get_object()
        item = SavedItem.objects.filter(user=request.user, listing=listing).first()
        if request.method == "POST":
            if not item:
                item = SavedItem.objects.create(user=request.user, listing=listing)
                MarketplaceEvent.objects.create(user=request.user, event=MarketplaceEvent.EventType.SAVE, listing=listing, category=listing.category, store=listing.store)
            return Response({"saved": True, "id": item.id}, status=201)
        if item:
            item.delete()
            MarketplaceEvent.objects.create(user=request.user, event=MarketplaceEvent.EventType.UNSAVE, listing=listing, category=listing.category, store=listing.store)
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



@api_view(["GET"])
def marketplace_feed(request):
    """Rank the complete eligible marketplace catalog, then paginate it.

    The order is deterministic for a given session seed, but differs between
    sessions. Personalization is derived from existing likes/saves plus the
    lightweight MarketplaceEvent history when available.
    """
    try:
        page = max(1, int(request.query_params.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = min(60, max(12, int(request.query_params.get("page_size", 40))))
    except (TypeError, ValueError):
        page_size = 40
    try:
        seed = int(request.query_params.get("seed", "0"))
    except (TypeError, ValueError):
        seed = 0

    now = timezone.now()
    qs = (Listing.objects
        .select_related("store", "store__owner", "category")
        .prefetch_related("images")
        .annotate(_likes_count=Count("liked_by", distinct=True))
        .filter(is_available=True, is_draft=False, store__is_active=True))

    # Optional browse filters are applied to the full catalog before ranking.
    category = request.query_params.get("category")
    store = request.query_params.get("store")
    search = request.query_params.get("search", "").strip()
    min_price = request.query_params.get("min_price")
    max_price = request.query_params.get("max_price")
    if category:
        qs = qs.filter(category_id=category)
    if store:
        qs = qs.filter(store_id=store)
    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search) | Q(store__name__icontains=search) | Q(category__name__icontains=search))
    if min_price:
        try: qs = qs.filter(price__gte=float(min_price))
        except ValueError: pass
    if max_price:
        try: qs = qs.filter(price__lte=float(max_price))
        except ValueError: pass

    user = request.user if request.user.is_authenticated else None
    category_affinity = {}
    store_affinity = {}
    listing_affinity = {}
    recent_seen = set()
    if user:
        # Existing explicit signals are stronger than passive events.
        for cid in ListingLike.objects.filter(user=user).values_list("listing__category_id", flat=True):
            category_affinity[cid] = category_affinity.get(cid, 0.0) + 3.0
        for cid in SavedItem.objects.filter(user=user).values_list("listing__category_id", flat=True):
            category_affinity[cid] = category_affinity.get(cid, 0.0) + 4.0
        try:
            from .models import CartItem
            for cid in CartItem.objects.filter(user=user).values_list("listing__category_id", flat=True):
                category_affinity[cid] = category_affinity.get(cid, 0.0) + 5.0
        except Exception:
            pass

        events = MarketplaceEvent.objects.filter(user=user, created_at__gte=now - timedelta(days=90)).values(
            "event", "listing_id", "category_id", "store_id", "created_at", "value"
        )
        event_weight = {"view": 1.0, "click": 1.5, "like": 3.0, "save": 4.0, "share": 3.0, "cart_add": 5.0, "purchase": 6.0, "search": 0.5}
        for e in events:
            w = event_weight.get(e["event"], 0.0)
            if not w: continue
            cid, sid, lid = e["category_id"], e["store_id"], e["listing_id"]
            if cid: category_affinity[cid] = category_affinity.get(cid, 0.0) + w
            if sid: store_affinity[sid] = store_affinity.get(sid, 0.0) + w * 0.55
            if lid: listing_affinity[lid] = listing_affinity.get(lid, 0.0) + w
            if e["event"] == "view" and e["created_at"] >= now - timedelta(days=7) and lid:
                recent_seen.add(lid)

        # Existing purchase/follow records are valuable signals even if an
        # analytics event was never emitted by an older app version.
        try:
            from orders.models import PurchaseRequest
            for row in PurchaseRequest.objects.filter(buyer=user).values("listing_id", "store_id", "listing__category_id"):
                lid, sid, cid = row["listing_id"], row["store_id"], row["listing__category_id"]
                listing_affinity[lid] = listing_affinity.get(lid, 0.0) + 6.0
                store_affinity[sid] = store_affinity.get(sid, 0.0) + 3.0
                category_affinity[cid] = category_affinity.get(cid, 0.0) + 5.0
        except Exception:
            pass
        for sid in StoreFollow.objects.filter(user=user).values_list("store_id", flat=True):
            store_affinity[sid] = store_affinity.get(sid, 0.0) + 4.0

    # Seller quality from existing reviews. No review table is assumed to be
    # present in the ranking path, so this remains optional and cheap.
    seller_quality = {}
    try:
        from reviews.models import Review
        for row in Review.objects.values("listing__store_id").annotate(avg=Avg("rating")):
            seller_quality[row["listing__store_id"]] = float(row["avg"] or 0) / 5.0
    except Exception:
        pass

    # Global marketplace signals: what other shoppers are actually looking at
    # and engaging with. These are aggregated once, not once per product.
    global_event_weights = {
        MarketplaceEvent.EventType.VIEW: 1.0,
        MarketplaceEvent.EventType.CLICK: 1.4,
        MarketplaceEvent.EventType.LIKE: 3.0,
        MarketplaceEvent.EventType.SAVE: 4.0,
        MarketplaceEvent.EventType.SHARE: 3.5,
        MarketplaceEvent.EventType.CART_ADD: 5.0,
        MarketplaceEvent.EventType.PURCHASE: 7.0,
    }
    global_event_score = {}
    rows = (MarketplaceEvent.objects
        .filter(listing_id__isnull=False, created_at__gte=now - timedelta(days=30), event__in=list(global_event_weights))
        .values("listing_id", "event")
        .annotate(total=Count("id")))
    for row in rows:
        global_event_score[row["listing_id"]] = global_event_score.get(row["listing_id"], 0.0) + row["total"] * global_event_weights[row["event"]]

    candidates = list(qs)
    total = len(candidates)
    if not candidates:
        return Response({"count": 0, "page": page, "page_size": page_size, "next": None, "previous": page - 1 if page > 1 else None, "results": []})

    # A user with no meaningful history gets a genuine cold-start feed.
    # Latest products lead the feed, while a small seeded shuffle keeps every
    # new session from looking like the exact same database ordering.
    has_behavior = bool(user and (category_affinity or store_affinity or listing_affinity))

    scored = []
    import math
    for listing in candidates:
        age_days = max(0.0, (now - listing.created_at).total_seconds() / 86400.0)
        freshness = math.exp(-age_days / (10.0 if not has_behavior else 18.0))
        views_popularity = min(1.0, math.log1p(max(0, listing.views)) / math.log1p(10000))
        social_popularity = min(1.0, math.log1p(max(0.0, global_event_score.get(listing.id, 0.0))) / math.log1p(500))
        engagement = min(1.0, math.log1p(max(0, listing._likes_count)) / math.log1p(500))
        affinity = min(1.0, category_affinity.get(listing.category_id, 0.0) / 20.0)
        seller = seller_quality.get(listing.store_id, 0.55)
        store_pref = min(1.0, store_affinity.get(listing.store_id, 0.0) / 20.0)
        item_pref = min(1.0, listing_affinity.get(listing.id, 0.0) / 12.0)
        discovery = 1.0 if listing.id not in recent_seen else 0.0
        featured = 1.0 if listing.is_featured else 0.0
        rnd = random.Random(f"{seed}:{listing.id}").random()

        if not has_behavior:
            # Cold start: newest inventory is the main signal. Popularity is
            # still present so proven products can surface naturally, but it
            # cannot overwhelm fresh listings.
            score = (
                freshness * 7.0 + social_popularity * 1.6 + views_popularity * 1.2
                + engagement * 0.8 + featured * 0.8 + discovery * 1.0 + rnd * 2.0
            )
        else:
            # Mature feed: learn from the user while continuously mixing in
            # marketplace-wide trends and fresh inventory.
            score = (
                freshness * 2.5 + social_popularity * 2.7 + views_popularity * 1.8
                + engagement * 1.8 + affinity * 5.0 + store_pref * 1.7
                + item_pref * 3.0 + seller * 1.0 + featured * 1.0
                + discovery * 2.0 + rnd * 1.8
            )
        scored.append([score, listing])

    scored.sort(key=lambda x: (-x[0], x[1].id))

    # Diversity re-ranking: cap repeated stores/categories near the top while
    # preserving the underlying relevance ordering as much as possible.
    ranked = []
    remaining = scored[:]
    first_window = min(10, total)
    while remaining:
        best_idx = 0
        if len(ranked) < first_window:
            for idx, (_, item) in enumerate(remaining):
                store_count = sum(x.store_id == item.store_id for x in ranked[-10:])
                cat_count = sum(x.category_id == item.category_id for x in ranked[-10:])
                if store_count < 2 and cat_count < 3:
                    best_idx = idx
                    break
        ranked.append(remaining.pop(best_idx))

    ordered = [item for _, item in ranked]
    start = (page - 1) * page_size
    page_items = ordered[start:start + page_size]

    liked_ids = set(ListingLike.objects.filter(user=user, listing_id__in=[x.id for x in page_items]).values_list("listing_id", flat=True)) if user and page_items else set()
    for item in page_items:
        item._liked_by_user = item.id in liked_ids

    return Response({
        "count": total,
        "page": page,
        "page_size": page_size,
        "next": page + 1 if start + page_size < total else None,
        "previous": page - 1 if page > 1 else None,
        "results": ListingSerializer(page_items, many=True, context={"request": request}).data,
    })


@api_view(["POST"])
def marketplace_events(request):
    if not request.user.is_authenticated:
        return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    events = request.data if isinstance(request.data, list) else request.data.get("events", [request.data])
    if not isinstance(events, list):
        return Response({"detail": "events must be an array."}, status=status.HTTP_400_BAD_REQUEST)
    allowed = {choice[0] for choice in MarketplaceEvent.EventType.choices}
    created = []
    for raw in events[:100]:
        if not isinstance(raw, dict) or raw.get("event") not in allowed:
            continue
        listing = None
        category = None
        store = None
        lid = raw.get("product_id", raw.get("listing_id"))
        try:
            if lid:
                listing = Listing.objects.select_related("category", "store").filter(pk=int(lid)).first()
        except (TypeError, ValueError):
            pass
        if listing:
            category, store = listing.category, listing.store
        elif raw.get("category_id"):
            category = Category.objects.filter(pk=raw.get("category_id")).first()
        elif raw.get("store_id"):
            store = Store.objects.filter(pk=raw.get("store_id")).first()
        created.append(MarketplaceEvent(
            user=request.user, event=raw["event"], listing=listing, category=category,
            store=store, query=str(raw.get("query", ""))[:200], value=raw.get("value"),
            metadata=raw.get("metadata") if isinstance(raw.get("metadata"), dict) else {},
        ))
    if created:
        MarketplaceEvent.objects.bulk_create(created)
    return Response({"accepted": len(created)})


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
                return Response({"detail": "Unsupported upload type."}, status=status.HTTP_400_BAD_REQUEST)

            folders = {
                "listing": f"marketplace/listings/user_{request.user.id}",
                "avatar": f"marketplace/profiles/user_{request.user.id}",
                "store_logo": f"marketplace/stores/user_{request.user.id}/logo",
                "store_cover": f"marketplace/stores/user_{request.user.id}/cover",
            }
            folder = folders[upload_type]
            allowed_formats = "jpg,jpeg,png,webp"
            params = {
                "folder": folder,
                "timestamp": timestamp,
                "allowed_formats": allowed_formats,
            }
            signature = api_sign_request(params, api_secret)

            return Response({
                "cloud_name": cloud_name,
                "api_key": api_key,
                "timestamp": timestamp,
                "signature": signature,
                "folder": folder,
                "allowed_formats": allowed_formats,
                "max_file_size": getattr(settings, "CLOUDINARY_MAX_IMAGE_BYTES", 10 * 1024 * 1024),
                "resource_type": "image",
            })
        except Exception as exc:
            # Don't expose the API secret, but return enough information to
            # diagnose a broken Cloudinary installation during development.
            return Response(
                {"detail": f"Cloudinary signing failed: {exc.__class__.__name__}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
