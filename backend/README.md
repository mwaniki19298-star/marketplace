# Marketplace Backend

Production-oriented Django REST backend for the Marketplace mobile application.

## Stack
- Django 5.2
- Django REST Framework
- SimpleJWT
- PostgreSQL (production) / SQLite (local fallback)
- Google ID-token verification
- CORS
- Filtering/search/order pagination
- Media uploads

## Core modules
- `accounts` — email/password and Google authentication
- `catalog` — categories, stores, listings, saved items, following
- `orders` — payment-independent purchase request lifecycle
- `reviews` — transaction reviews and store recommendations
- `messaging` — buyer/seller conversations
- `notifications` — in-app notifications
- `moderation` — reports and marketplace safety

## Setup

```bash
python -m venv .venv
# Windows
.venv\\Scripts\\activate
# Linux/macOS
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # Windows
# or cp .env.example .env
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

API base URL: `http://127.0.0.1:8000/api/`

## Google login

Create Google OAuth clients for the platforms you use and set `GOOGLE_CLIENT_IDS` in `.env` as a comma-separated list. Keep `GOOGLE_CLIENT_ID` only if you want backward compatibility. The mobile application should send a Google ID token to:

`POST /api/auth/google/`

Body:

```json
{ "id_token": "GOOGLE_ID_TOKEN" }
```

The backend verifies the token with Google and returns access/refresh JWTs.

For native Expo authentication, obtain the Google ID token using a supported Expo authentication flow and send only the token to the backend. Do not send a Google password to the Marketplace backend.

## Important transaction design

The backend does **not** process, store, or hold marketplace payments.

The order lifecycle is:

`pending -> accepted -> preparing -> ready -> completed`

Buyers can request a purchase, sellers can accept it, and the buyer confirms receipt. Reviews are only intended for completed transactions.

## Main endpoints

### Auth
- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/google/`
- `GET /api/auth/me/`

### Catalog
- `/api/categories/`
- `/api/listings/`
- `/api/listings/feed/`
- `/api/listings/saved/`
- `/api/listings/{id}/save_item/`
- `/api/stores/`
- `/api/stores/{id}/follow/`
- `/api/stores/{id}/listings/`

### Commerce
- `/api/orders/`
- `/api/orders/{id}/transition/`
- `/api/orders/{id}/confirm_received/`

### Social/trust
- `/api/reviews/`
- `/api/recommendations/`
- `/api/conversations/`
- `/api/messages/`
- `/api/notifications/`
- `/api/reports/`

## Next integration step

Update the React Native client to replace its local mock data and alerts with API calls to this backend. Keep the existing single-column Instagram-style mobile feed and dark mode UI.
