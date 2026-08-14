from django.contrib.auth import password_validation
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.http import JsonResponse
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from .api_serializers import (
    DEFAULT_NOTIFICATION_SETTINGS,
    DEFAULT_SETTINGS,
    NotificationPreferencesSerializer,
    PreferencesSerializer,
)
from .models import NotificationPreferences, UserPreferences


def _user_listings(user):
    from catalog.models import Listing
    return list(Listing.objects.filter(store__owner=user).values("id", "title", "created_at"))


def _preferences(user):
    obj, _ = UserPreferences.objects.get_or_create(user=user, defaults={"settings": DEFAULT_SETTINGS})
    return obj


def _notification_preferences(user):
    obj, _ = NotificationPreferences.objects.get_or_create(
        user=user, defaults={"settings": DEFAULT_NOTIFICATION_SETTINGS}
    )
    return obj


class PreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(PreferencesSerializer(_preferences(request.user)).data)

    def patch(self, request):
        obj = _preferences(request.user)
        incoming = request.data.get("settings", request.data)
        if not isinstance(incoming, dict):
            return Response({"detail": "settings must be an object."}, status=400)
        obj.settings = {**DEFAULT_SETTINGS, **(obj.settings or {}), **incoming}
        obj.save(update_fields=["settings", "updated_at"])
        return Response(PreferencesSerializer(obj).data)

    def delete(self, request):
        obj = _preferences(request.user)
        obj.settings = DEFAULT_SETTINGS.copy()
        obj.save(update_fields=["settings", "updated_at"])
        return Response(PreferencesSerializer(obj).data)


class NotificationPreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(NotificationPreferencesSerializer(_notification_preferences(request.user)).data)

    def patch(self, request):
        obj = _notification_preferences(request.user)
        incoming = request.data.get("settings", request.data)
        if not isinstance(incoming, dict):
            return Response({"detail": "settings must be an object."}, status=400)
        obj.settings = {**DEFAULT_NOTIFICATION_SETTINGS, **(obj.settings or {}), **incoming}
        obj.save(update_fields=["settings", "updated_at"])
        return Response(NotificationPreferencesSerializer(obj).data)

    def delete(self, request):
        obj = _notification_preferences(request.user)
        obj.settings = DEFAULT_NOTIFICATION_SETTINGS.copy()
        obj.save(update_fields=["settings", "updated_at"])
        return Response(NotificationPreferencesSerializer(obj).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current = request.data.get("current_password", "")
        new = request.data.get("new_password", "")
        confirm = request.data.get("new_password_confirm", "")
        if not current or not new or not confirm:
            return Response({"detail": "Current password, new password and confirmation are required."}, status=400)
        if not request.user.check_password(current):
            return Response({"detail": "Current password is incorrect."}, status=400)
        if new != confirm:
            return Response({"detail": "New passwords do not match."}, status=400)
        try:
            password_validation.validate_password(new, request.user)
        except Exception as exc:
            return Response({"password": list(exc.messages)}, status=400)
        request.user.set_password(new)
        request.user.save(update_fields=["password"])
        return Response({"detail": "Password changed successfully. Please sign in again on other devices."})


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        # Deliberately return the same response for unknown accounts to prevent account enumeration.
        if email:
            from .models import User
            user = User.objects.filter(email__iexact=email, is_active=True).first()
            if user:
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                reset_url = f"{request.build_absolute_uri('/api/auth/password-reset/confirm/')}?uid={uid}&token={token}"
                try:
                    send_mail(
                        "Marketplace password reset",
                        f"Use this password reset link: {reset_url}",
                        None,
                        [user.email],
                        fail_silently=True,
                    )
                except Exception:
                    pass
        return Response({"detail": "If an account exists for that email, password reset instructions have been sent."})


class ResetPasswordConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        new = request.data.get("new_password", "")
        confirm = request.data.get("new_password_confirm", "")
        if not uid or not token or not new or new != confirm:
            return Response({"detail": "A valid reset token and matching new password are required."}, status=400)
        try:
            from .models import User
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
        except Exception:
            return Response({"detail": "Invalid or expired reset token."}, status=400)
        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Invalid or expired reset token."}, status=400)
        try:
            password_validation.validate_password(new, user)
        except Exception as exc:
            return Response({"password": list(exc.messages)}, status=400)
        user.set_password(new)
        user.save(update_fields=["password"])
        return Response({"detail": "Password reset successfully."})


class ExportAccountDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        payload = {
            "account": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at.isoformat(),
                "last_seen_at": user.last_seen_at.isoformat() if user.last_seen_at else None,
            },
            "preferences": _preferences(user).settings,
            "notification_preferences": _notification_preferences(user).settings,
            "listings": _user_listings(user),
            "notifications": list(user.notifications.values("id", "kind", "title", "body", "is_read", "created_at")),
        }
        response = JsonResponse(payload)
        response["Content-Disposition"] = 'attachment; filename="marketplace-account-data.json"'
        return response


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        confirmation = str(request.data.get("confirmation", "")).strip().upper()
        if confirmation != "DELETE":
            return Response({"detail": 'Type "DELETE" to permanently delete your account.'}, status=400)
        password = request.data.get("password")
        if password and not request.user.check_password(password):
            return Response({"detail": "Password is incorrect."}, status=400)
        with transaction.atomic():
            user = request.user
            user.delete()
        return Response({"detail": "Account deleted."})


class SignOutAllDevicesView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        tokens = OutstandingToken.objects.filter(user=request.user)
        for token in tokens:
            BlacklistedToken.objects.get_or_create(token=token)
        return Response({"detail": "All refresh tokens have been revoked. Other active access tokens will expire normally."})
