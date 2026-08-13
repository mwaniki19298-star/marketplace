from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class MarketplaceUserAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "full_name", "is_staff", "is_community_verified", "created_at")
    search_fields = ("email", "full_name")
    fieldsets = UserAdmin.fieldsets + (("Marketplace", {"fields": ("full_name", "avatar", "google_id", "is_community_verified", "last_seen_at")}),)
