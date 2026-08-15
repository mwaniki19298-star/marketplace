# Cart 404 Fix

The mobile app now prefers the local Django server during Expo development when EXPO_PUBLIC_API_BASE_URL is not explicitly set. This prevents development builds from silently calling the production API.

For a physical phone, keep the phone and PC on the same Wi-Fi and run:

```powershell
python manage.py runserver 0.0.0.0:8000
npx expo start -c
```

The backend also declares explicit `/api/cart/` and `/api/cart/<id>/` routes before the generic DRF router.

In Expo development, API calls are logged in Metro/terminal as:

```text
[API] POST http://192.168.x.x:8000/api/cart/ -> 201
```

Django logs cart creation as:

```text
CART ADD user=... listing_id=... quantity=...
CART ADD SUCCESS ...
```
