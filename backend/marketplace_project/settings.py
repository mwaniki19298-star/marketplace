import json
from pathlib import Path
import os
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "false").lower() == "true"
raw_allowed_hosts = os.getenv("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost,emilio2026.pythonanywhere.com")

if raw_allowed_hosts.strip() == "*":
    ALLOWED_HOSTS = ["*"]
else:
    ALLOWED_HOSTS = [host.strip() for host in raw_allowed_hosts.split(",") if host.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "accounts",
    "catalog",
    "orders",
    "reviews",
    "messaging",
    "notifications",
    "moderation",
    "calls",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "marketplace_project.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "marketplace_project.wsgi.application"
ASGI_APPLICATION = "marketplace_project.asgi.application"

DB_ENGINE = os.getenv("DB_ENGINE", "sqlite")
if DB_ENGINE == "postgres":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "marketplace"),
            "USER": os.getenv("POSTGRES_USER", "marketplace"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "marketplace"),
            "HOST": os.getenv("POSTGRES_HOST", "127.0.0.1"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
            "CONN_MAX_AGE": 60,
        }
    }
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.getenv("TIME_ZONE", "Africa/Nairobi")
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Email delivery for account/store verification. Configure these values in the
# deployment environment (for example Gmail SMTP with an app password, or an SMTP provider).
EMAIL_HOST = os.getenv("EMAIL_HOST", "").strip()
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() == "true"
EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "false").lower() == "true"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "").strip()
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER or "no-reply@marketplace.local")
if EMAIL_HOST:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [x.strip() for x in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:8081,https://marketplace.co.ke,https://www.marketplace.co.ke").split(",") if x.strip()]
CORS_ALLOW_CREDENTIALS = True

# Allow Vercel preview/deployment URLs for the Marketplace project.
# Examples:
# https://marketplace-er4z50dlm-marketplace13.vercel.app
# https://marketplace-jzzn04xwj-marketplace13.vercel.app
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://marketplace-[a-zA-Z0-9-]+-marketplace13\.vercel\.app$",
]

# Allow the same Vercel deployment pattern for Django CSRF protection.
CSRF_TRUSTED_ORIGIN_REGEXES = [
    r"^https://marketplace-[a-zA-Z0-9-]+-marketplace13\.vercel\.app$",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "core.pagination.DefaultPageNumberPagination",
    "PAGE_SIZE": 20,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.getenv("ACCESS_TOKEN_MINUTES", "30"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.getenv("REFRESH_TOKEN_DAYS", "30"))),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# WebRTC ICE/TURN configuration.
# Keep TURN credentials on the backend. WEBRTC_TURN_SERVERS_JSON should be a
# JSON array, for example:
# [{"urls":["turn:turn.example.com:3478?transport=udp","turn:turn.example.com:3478?transport=tcp"],"username":"...","credential":"..."}]
# Never put long-lived TURN credentials in EXPO_PUBLIC_* variables.
WEBRTC_TURN_SERVERS_JSON = os.getenv("WEBRTC_TURN_SERVERS_JSON", "").strip()
WEBRTC_TURN_SERVERS = []
if WEBRTC_TURN_SERVERS_JSON:
    try:
        parsed_turn_servers = json.loads(WEBRTC_TURN_SERVERS_JSON)
        if isinstance(parsed_turn_servers, list):
            WEBRTC_TURN_SERVERS = [item for item in parsed_turn_servers if isinstance(item, dict) and item.get("urls")]
    except (TypeError, ValueError, json.JSONDecodeError):
        WEBRTC_TURN_SERVERS = []

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
# Comma-separated Google OAuth client IDs accepted by the backend.
# This lets Android, iOS, and Web use their own Google OAuth clients.
GOOGLE_CLIENT_IDS = [x.strip() for x in os.getenv("GOOGLE_CLIENT_IDS", GOOGLE_CLIENT_ID).split(",") if x.strip()]

# Public sharing / App Links / Universal Links configuration.
PUBLIC_WEB_BASE_URL = os.getenv("PUBLIC_WEB_BASE_URL", "").strip().rstrip("/")
MARKETPLACE_WEB_DOMAIN = os.getenv("MARKETPLACE_WEB_DOMAIN", "").strip().lower()
MARKETPLACE_ANDROID_PACKAGE = os.getenv("MARKETPLACE_ANDROID_PACKAGE", "com.marketplace.mobile").strip()
MARKETPLACE_ANDROID_SHA256 = os.getenv("MARKETPLACE_ANDROID_SHA256", "").strip()
MARKETPLACE_IOS_APP_ID = os.getenv("MARKETPLACE_IOS_APP_ID", "").strip()
ANDROID_APP_STORE_URL = os.getenv("ANDROID_APP_STORE_URL", "").strip()
IOS_APP_STORE_URL = os.getenv("IOS_APP_STORE_URL", "").strip()

# Cloudinary
# Preferred configuration uses the three explicit environment variables.
# CLOUDINARY_URL is also supported as a fallback (cloudinary://key:secret@cloud_name).
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "").strip()
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "").strip()
CLOUDINARY_MAX_IMAGE_BYTES = int(os.getenv("CLOUDINARY_MAX_IMAGE_BYTES", str(10 * 1024 * 1024)))

if not all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET]):
    cloudinary_url = os.getenv("CLOUDINARY_URL", "").strip()
    if cloudinary_url.startswith("cloudinary://"):
        from urllib.parse import urlparse, unquote
        parsed = urlparse(cloudinary_url)
        CLOUDINARY_API_KEY = CLOUDINARY_API_KEY or unquote(parsed.username or "")
        CLOUDINARY_API_SECRET = CLOUDINARY_API_SECRET or unquote(parsed.password or "")
        CLOUDINARY_CLOUD_NAME = CLOUDINARY_CLOUD_NAME or (parsed.hostname or "")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO"},
        "marketplace": {"handlers": ["console"], "level": "INFO"},
    },
}
