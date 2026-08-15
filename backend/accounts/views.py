import logging
from django.db import IntegrityError, transaction
from django.conf import settings
from django.utils import timezone
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer, UserUpdateSerializer, token_pair

logger = logging.getLogger("marketplace")

class RegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = serializer.save()
        except IntegrityError:
            return Response({"email": ["An account with this email already exists."]}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"user": UserSerializer(user, context={"request": request}).data, **token_pair(user)}, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            details = serializer.errors.get("detail")
            code = serializer.errors.get("code")
            if isinstance(code, list):
                code = code[0]
            if isinstance(details, list):
                details = details[0]
            if isinstance(details, dict):
                details = details.get("message") or str(details)
            if not details:
                details = "Username or password incorrect."
            return Response({"code": code or "invalid_credentials", "detail": details}, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.validated_data["user"]
        user.last_seen_at = timezone.now()
        user.save(update_fields=["last_seen_at"])
        return Response({"user": UserSerializer(user, context={"request": request}).data, **token_pair(user)})

class GoogleAuthView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        token = request.data.get("id_token")
        if not token:
            return Response({"detail": "id_token is required."}, status=400)
        allowed_client_ids = list(getattr(settings, "GOOGLE_CLIENT_IDS", []))
        if not allowed_client_ids and getattr(settings, "GOOGLE_CLIENT_ID", ""):
            allowed_client_ids = [settings.GOOGLE_CLIENT_ID]
        if not allowed_client_ids:
            return Response({"detail": "Google OAuth is not configured on the server."}, status=503)
        try:
            # Accept the platform-specific Android/iOS client IDs as well as the Web client ID.
            info = id_token.verify_oauth2_token(token, google_requests.Request(), None)
            if info.get("aud") not in allowed_client_ids:
                raise ValueError("Google token audience is not an allowed Marketplace client ID")
        except Exception as exc:
            logger.warning("Google token verification failed: %s", exc)
            return Response({"detail": "Invalid Google token."}, status=401)
        email = info.get("email")
        google_id = info.get("sub")
        email_verified = info.get("email_verified")
        if not email or not google_id:
            return Response({"detail": "Google token is missing required identity fields."}, status=400)
        if email_verified is not True:
            return Response({"detail": "Google email verification is required."}, status=401)
        try:
            with transaction.atomic():
                user, _ = User.objects.get_or_create(email=email, defaults={
                    "full_name": info.get("name", email.split("@")[0]),
                    "google_id": google_id,
                })
        except IntegrityError:
            user = User.objects.get(email=email)
        changed = []
        if not user.google_id:
            user.google_id = google_id; changed.append("google_id")
        if info.get("name") and user.full_name != info["name"]:
            user.full_name = info["name"]; changed.append("full_name")
        user.last_seen_at = timezone.now(); changed.append("last_seen_at")
        if changed: user.save(update_fields=changed)
        return Response({"user": UserSerializer(user, context={"request": request}).data, **token_pair(user)})

class PublicUserView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, user_id):
        user = get_object_or_404(User, pk=user_id, is_active=True)
        return Response(UserSerializer(user, context={"request": request}).data)


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    # Accept both multipart/form-data (mobile image/profile updates) and JSON
    # for backwards compatibility with existing clients.
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(UserSerializer(request.user, context={"request": request}).data)

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user, context={"request": request}).data)
