from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import GoogleAuthView, LoginView, MeView, RegisterView
from catalog.views import CategoryViewSet, ListingViewSet, StoreViewSet, CloudinarySignatureView
from orders.views import PurchaseRequestViewSet
from reviews.views import RecommendationViewSet, ReviewViewSet
from messaging.views import ConversationViewSet, MessageViewSet
from notifications.views import NotificationViewSet
from moderation.views import ReportViewSet
from core.health import HealthView
from catalog.web_views import listing_share_page, android_assetlinks, ios_aasa

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("listings", ListingViewSet, basename="listing")
router.register("stores", StoreViewSet, basename="store")
router.register("orders", PurchaseRequestViewSet, basename="order")
router.register("reviews", ReviewViewSet, basename="review")
router.register("recommendations", RecommendationViewSet, basename="recommendation")
router.register("conversations", ConversationViewSet, basename="conversation")
router.register("messages", MessageViewSet, basename="message")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("reports", ReportViewSet, basename="report")

urlpatterns = [
    path("listing/<int:listing_id>/<slug:slug>/", listing_share_page, name="listing-share"),
    path(".well-known/assetlinks.json", android_assetlinks, name="android-assetlinks"),
    path(".well-known/apple-app-site-association", ios_aasa, name="ios-aasa"),
    path("admin/", admin.site.urls),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/login/", LoginView.as_view(), name="login"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/auth/google/", GoogleAuthView.as_view(), name="google-auth"),
    path("api/auth/me/", MeView.as_view(), name="me"),
    path("api/health/", HealthView.as_view(), name="health"),
    path("api/media/cloudinary/sign/", CloudinarySignatureView.as_view(), name="cloudinary-signature"),
    path("api/", include((router.urls, "api"))),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
