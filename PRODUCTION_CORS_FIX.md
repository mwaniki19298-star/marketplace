# Production API / Vercel Fixes

The production frontend is currently served from:
`https://marketplace-picpibes-marketplace13.vercel.app`

The backend now allows the active Vercel production aliases and the custom
`marketplace.co.ke` domains through CORS and CSRF trusted origins.

## Backend changes

- `backend/marketplace_project/settings.py`
  - Added `CSRF_TRUSTED_ORIGINS`.
  - Added the current Vercel domains to CORS defaults.
  - Keeps credentialed requests enabled.
- `backend/.env`
  - Updated `CORS_ALLOWED_ORIGINS`.
  - Added `CSRF_TRUSTED_ORIGINS`.
  - Updated the public web domain to the current Vercel production domain.
- `backend/core/exchange_rates.py`
  - The public exchange-rate GET endpoint explicitly uses `AllowAny`.
  - This fixes the `401 Unauthorized` shown in the browser console for `/api/exchange-rates/`.

## Frontend changes

- `mobile/.env`
  - Added `VITE_API_BASE_URL` and local `VITE_API_PROXY_TARGET`.
  - Updated the production web domain to the current Vercel domain.
- `mobile/vite.config.ts`
  - Exposes `VITE_API_BASE_URL` at build time.
- `mobile/eas.json`
  - Updated production/preview/development web URL values.

## Deployment

After uploading the backend changes to PythonAnywhere:

1. Make sure `django-cors-headers` from `requirements.txt` is installed in the
   PythonAnywhere virtual environment.
2. Reload the PythonAnywhere web application.
3. Redeploy the Vercel frontend.
4. Hard-refresh the browser and test `/api/categories/`, `/api/listings/`,
   `/api/marketplace/feed/`, and `/api/exchange-rates/?base=USD`.

Do not set `CORS_ALLOW_ALL_ORIGINS=True` for production.
