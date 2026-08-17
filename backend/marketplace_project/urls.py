from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import GoogleAuthView, LoginView, MeView, PublicUserView, RegisterView
from accounts.api_views import (PreferencesView, NotificationPreferencesView, ChangePasswordView, ForgotPasswordView, ResetPasswordConfirmView, ExportAccountDataView, DeleteAccountView, SignOutAllDevicesView)
from catalog.views import CategoryViewSet, ListingViewSet, StoreViewSet, CloudinarySignatureView, marketplace_feed, marketplace_events
from catalog.cart_views import CartViewSet
from orders.views import PurchaseRequestViewSet
from reviews.views import RecommendationViewSet, ReviewViewSet, ListingReviewsView
from messaging.views import ConversationViewSet, MessageViewSet
from notifications.views import NotificationViewSet
from moderation.views import ReportViewSet
from calls.views import CallViewSet
from core.health import HealthView
from core.exchange_rates import exchange_rates
from catalog.web_views import listing_share_page, android_assetlinks, ios_aasa

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("listings", ListingViewSet, basename="listing")
router.register("cart", CartViewSet, basename="cart")
router.register("stores", StoreViewSet, basename="store")
router.register("orders", PurchaseRequestViewSet, basename="order")
router.register("reviews", ReviewViewSet, basename="review")
router.register("recommendations", RecommendationViewSet, basename="recommendation")
router.register("conversations", ConversationViewSet, basename="conversation")
router.register("messages", MessageViewSet, basename="message")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("reports", ReportViewSet, basename="report")
router.register("calls", CallViewSet, basename="call")

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
    path("api/auth/users/<int:user_id>/", PublicUserView.as_view(), name="public-user"),
    path("api/auth/preferences/", PreferencesView.as_view(), name="preferences"),
    path("api/auth/notification-preferences/", NotificationPreferencesView.as_view(), name="notification-preferences"),
    path("api/auth/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("api/auth/password-reset/", ForgotPasswordView.as_view(), name="password-reset"),
    path("api/auth/password-reset/confirm/", ResetPasswordConfirmView.as_view(), name="password-reset-confirm"),
    path("api/auth/export-data/", ExportAccountDataView.as_view(), name="export-account-data"),
    path("api/auth/delete-account/", DeleteAccountView.as_view(), name="delete-account"),
    path("api/auth/sign-out-all/", SignOutAllDevicesView.as_view(), name="sign-out-all"),
    path("api/health/", HealthView.as_view(), name="health"),
    path("api/exchange-rates/", exchange_rates, name="exchange-rates"),
    path("api/media/cloudinary/sign/", CloudinarySignatureView.as_view(), name="cloudinary-signature"),
    path("api/listings/<int:listing_id>/reviews/", ListingReviewsView.as_view(), name="listing-reviews"),
    # Explicit cart routes keep the cart API unambiguous even when router
    # patterns change. These are intentionally declared before the generic
    # router include.
    path("api/cart/", CartViewSet.as_view({"get": "list", "post": "create"}), name="cart-list"),
    path("api/cart/<int:pk>/", CartViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy", "head": "retrieve"}), name="cart-detail"),
    path("api/", include((router.urls, "api"))),

    path("api/marketplace/feed/", marketplace_feed, name="marketplace-feed"),
    path("api/marketplace/events/", marketplace_events, name="marketplace-events"),]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
