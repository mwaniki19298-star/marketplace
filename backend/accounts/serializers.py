from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.password_validation import validate_password
from .models import User

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


class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    def get_avatar(self, obj):
        return media_url(self.context.get("request"), obj.avatar)

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "avatar", "is_community_verified", "created_at"]
        read_only_fields = fields

class UserUpdateSerializer(serializers.ModelSerializer):
    avatar_url = serializers.URLField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["email", "full_name", "avatar", "avatar_url"]
        read_only_fields = ["email", "avatar"]

    def update(self, instance, validated_data):
        avatar_url = validated_data.pop("avatar_url", None)
        if avatar_url is not None:
            instance.avatar.name = avatar_url or None
        return super().update(instance, validated_data)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ["email", "full_name", "password", "password_confirm"]
    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        attrs["email"] = email
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({"email": "An account with this email already exists."})
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        temp_user = User(email=email, full_name=attrs.get("full_name", ""))
        try:
            validate_password(attrs["password"], user=temp_user)
        except Exception as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs
    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        password = attrs["password"]
        try:
            user_obj = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({
                "code": "invalid_credentials",
                "detail": "Username or password incorrect.",
            })
        user = authenticate(username=email, password=password)
        if not user:
            raise serializers.ValidationError({
                "code": "invalid_password",
                "detail": "Incorrect password.",
            })
        if not user.is_active:
            raise serializers.ValidationError({
                "code": "inactive_account",
                "detail": "This account is inactive.",
            })
        attrs["user"] = user
        return attrs

def token_pair(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}
