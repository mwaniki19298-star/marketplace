# Marketplace real-data integration

The mobile app no longer seeds the Home/Browse marketplace feed with template listings. It loads listings and categories from the Django API.

## Mobile setup

1. From `Marketplace/mobile` run:

```powershell
npm install
npx expo start -c
```

2. Create `Marketplace/mobile/.env` from `.env.example` and set:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR-PC-LAN-IP:8000
```

When using a physical Android phone, use the PC's LAN IP rather than `127.0.0.1`.

3. The app calls:

- `GET /api/listings/?is_available=true&ordering=-created_at`
- `GET /api/categories/`
- `GET /api/listings/saved/` (authenticated)
- `GET /api/auth/me/` (authenticated)
- `POST /api/auth/login/`
- `POST /api/auth/register/`
- `POST /api/auth/google/`
- `POST/DELETE /api/listings/<id>/save_item/`

## Backend setup

Run the new catalog migration:

```powershell
cd ..\backend
python manage.py migrate
```

Public listing endpoints now exclude draft listings.

## No mock feed fallback

If the backend is unavailable, the app shows an error card and an empty marketplace state instead of displaying hard-coded sample listings.

## Next integration targets

The following actions still need their API wiring in the next pass:

- Publish/save-draft listing creation from the mobile Create Listing form
- Cloudinary upload + listing creation
- Purchase request
- Buyer/seller messaging
- Reviews
- Notifications
- Following stores
