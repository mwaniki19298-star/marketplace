import json
import os

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_GET

from .models import Listing


def public_base_url(request):
    configured = getattr(settings, "PUBLIC_WEB_BASE_URL", "").strip().rstrip("/")
    return configured or request.build_absolute_uri("/").rstrip("/")


@require_GET
def listing_share_page(request, listing_id, slug=None):
    listing = get_object_or_404(
        Listing.objects.select_related("store", "category").prefetch_related("images"),
        pk=listing_id,
        is_available=True,
        is_draft=False,
    )
    image = listing.images.first()
    image_url = image.image if image else ""
    base_url = public_base_url(request)
    canonical_url = f"{base_url}/listing/{listing.id}/{listing.slug}/"
    price = ""
    if listing.price is not None:
        price = f"{listing.currency} {listing.price:,.2f}".replace(".00", "")

    context = {
        "listing": listing,
        "image_url": image_url,
        "canonical_url": canonical_url,
        "price": price,
        "app_link": f"marketplace://listing/{listing.id}/{listing.slug}",
        "android_store_url": getattr(settings, "ANDROID_APP_STORE_URL", "").strip(),
        "ios_store_url": getattr(settings, "IOS_APP_STORE_URL", "").strip(),
    }
    return render(request, "catalog/listing_share.html", context)


@require_GET
def android_assetlinks(request):
    package_name = getattr(settings, "MARKETPLACE_ANDROID_PACKAGE", "").strip()
    fingerprint = getattr(settings, "MARKETPLACE_ANDROID_SHA256", "").strip().replace(":", "").upper()
    if not package_name or not fingerprint:
        return JsonResponse([], safe=False)
    data = [{
        "relation": ["delegate_permission/common.handle_all_urls"],
        "target": {
            "namespace": "android_app",
            "package_name": package_name,
            "sha256_cert_fingerprints": [fingerprint],
        },
    }]
    return JsonResponse(data, safe=False, content_type="application/json")


@require_GET
def ios_aasa(request):
    app_id = getattr(settings, "MARKETPLACE_IOS_APP_ID", "").strip()
    if not app_id:
        return JsonResponse({"applinks": {"details": []}})
    return JsonResponse({
        "applinks": {
            "details": [{
                "appIDs": [app_id],
                "components": [{"/": "/listing/*"}],
            }]
        }
    })
