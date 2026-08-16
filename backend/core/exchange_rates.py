from datetime import timedelta

import requests
from django.core.cache import cache
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny


CACHE_KEY = "marketplace_exchange_rates_usd"
CACHE_TTL = 60 * 60  # refresh at most hourly; the provider publishes current rates.


@api_view(["GET"])
@permission_classes([AllowAny])
def exchange_rates(request):
    base = str(request.query_params.get("base", "USD")).upper()
    if base != "USD":
        return JsonResponse({"detail": "USD is the supported rate base."}, status=400)

    force_refresh = str(request.query_params.get("refresh", "0")).lower() in {"1", "true", "yes"}
    cached = cache.get(CACHE_KEY)
    if cached and not force_refresh:
        return JsonResponse(cached)

    try:
        response = requests.get("https://open.er-api.com/v6/latest/USD", timeout=8)
        response.raise_for_status()
        payload = response.json()
        rates = payload.get("rates") or {}
        if not rates:
            raise ValueError("No exchange rates returned")
        result = {
            "base": "USD",
            "rates": rates,
            "fetched_at": payload.get("time_last_update_utc"),
            "provider": "open.er-api.com",
        }
        cache.set(CACHE_KEY, result, CACHE_TTL)
        return JsonResponse(result)
    except Exception:
        stale = cache.get(CACHE_KEY)
        if stale:
            return JsonResponse(stale)
        return JsonResponse({"detail": "Exchange rates are temporarily unavailable."}, status=503)
