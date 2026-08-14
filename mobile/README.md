# Marketplace Mobile & Web

This mobile app now contains a functional navigation shell and working screens beyond Browse. It also includes a responsive web version.

## Run locally (Web)

```bash
cd mobile
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173. Resize the window (or use dev tools device mode) to see the shell adapt — sidebar and top-bar search below 768px collapse into the mobile bottom nav.

## Connect to backend (local development)

Follow these steps to run the Django backend and have the mobile app proxy API calls to it during development.

- **Backend (Windows PowerShell)**:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py runserver 8000
```

- **Backend (macOS / Linux / Git Bash)**:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 8000
```

- **Mobile/Web (same machine)**:

```bash
cd mobile
npm install
cp .env.example .env
npm run dev
```

Visit http://localhost:5173 in the browser. The Vite dev server proxies requests under `/api` to the backend using `VITE_API_PROXY_TARGET`, so frontend code can call the API with the base path `/api`.

## Screens

- Home: marketplace overview, categories, recommendations, and entry points.
- Browse: Instagram-style single-column listing feed with search and saved-item toggles.
- Product: listing detail page with save, contact seller, and purchase-request actions.
- Sell: create listing form with local draft-save interaction.
- Saved: saved listings feed.
- Profile: account overview, orders, store, following, settings, and sign-out interactions.
- Orders: recent purchase request/order statuses.
- Notifications: marketplace notification feed.
- Messages: conversation list with interactive conversation opening.
- Store: example seller storefront.
- Settings: global dark-mode toggle plus notification/privacy controls.

## Notes

- The current mobile app uses local mock data and local screen state so the UI is fully navigable without a backend.
- Backend API integration can be added later without redesigning the screen structure.
- Dark mode is persisted for the current app session through state; connect it to AsyncStorage when backend/mobile persistence is added.


## Google Sign-In

Install dependencies with `npx expo install expo-auth-session expo-web-browser`. Add the variables from `.env.example` to `.env`. The Google button now opens Google's real OAuth consent/account screen and sends the returned ID token to Django at `/api/auth/google/`.

For Expo Go on a physical phone, `EXPO_PUBLIC_API_BASE_URL` must point to the Django server using the computer's LAN IP (for example `http://192.168.1.20:8000`), and the phone and computer must be on the same network.


## Website commands

- `npm run build` builds the static website into `dist/`.
- `npm run dev` serves the website with the Vite development server. It starts a local development server and supports hot module replacement.
- `npm start` is an alias for `npm run dev`.
- On Render, use `npm install && npm run build` as the build command and `npm run dev` as the start command.


## Direct Cloudinary image uploads

Listing images are uploaded directly from the Expo/Android app to Cloudinary using an **unsigned upload preset**. The Django API is not in the image-byte upload path; it only receives the resulting Cloudinary `secure_url` and `public_id` when the listing is created.

Configure these mobile build-time variables:

```text
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=...
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=...
```

The Cloudinary upload preset must be **unsigned** and restricted to the Marketplace image requirements. Never put `CLOUDINARY_API_SECRET` or any other Cloudinary secret in the mobile app.

The backend `/api/media/cloudinary/sign/` endpoint is retained for backward compatibility with older clients, but the current mobile client does not call it.
