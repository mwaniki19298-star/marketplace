# Google Sign-In setup

Marketplace is wired for Google OpenID Connect sign-in. The mobile app obtains a Google ID token and sends it to `POST /api/auth/google/`; Django verifies the token signature, issuer/audience, and `email_verified` before creating or signing in the Marketplace account.

## 1. Create Google OAuth clients

In Google Cloud Console, create a project and configure the OAuth consent screen / Google Auth Platform. Create an OAuth client for each platform you will ship:

- Android client: package `com.marketplace.mobile` (or the package in `EXPO_PUBLIC_ANDROID_PACKAGE`) plus the SHA-1 certificate fingerprint used by your build.
- iOS client: bundle ID `com.marketplace.mobile` (or `EXPO_PUBLIC_IOS_BUNDLE_ID`) plus your Apple Team ID where Google requests it.
- Web client: use this for browser/web sign-in.

Do not put a client secret in the mobile app. Client IDs are public identifiers; secrets belong on the server.

## 2. Mobile `.env`

Copy `.env.example` to `.env` and replace the placeholders:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...apps.googleusercontent.com
```

Also set the API URL reachable from the phone.

## 3. Backend `.env`

Set all client IDs accepted by the backend:

```env
GOOGLE_CLIENT_IDS=ANDROID_CLIENT_ID.apps.googleusercontent.com,IOS_CLIENT_ID.apps.googleusercontent.com,WEB_CLIENT_ID.apps.googleusercontent.com
```

`GOOGLE_CLIENT_ID` remains supported for backward compatibility, but `GOOGLE_CLIENT_IDS` is preferred.

## 4. Install dependencies

```bash
cd mobile
npx expo install expo-auth-session expo-crypto expo-web-browser
npm install
```

Google OAuth redirects require a custom app scheme and a development/standalone build for native testing. Expo Go is not suitable for this OAuth redirect flow.

## 5. Run

```bash
# backend
cd backend
python manage.py migrate
python manage.py runserver 0.0.0.0:8000

# mobile
cd mobile
npx expo start
```

For an Android development build, use an EAS/dev build or `npx expo run:android` after native configuration is generated.

## Sign-in flow

`Google -> ID token -> /api/auth/google/ -> verify token -> find/create User -> Marketplace JWT access/refresh -> app session`

Existing email accounts are linked to the Google account when the Google email matches. The backend stores the Google subject (`sub`) and never receives the user's Google password.
