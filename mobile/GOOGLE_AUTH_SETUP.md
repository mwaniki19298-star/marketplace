# Marketplace Google Sign-In setup

Marketplace uses `expo-auth-session/providers/google` and sends the Google ID token to Django at `/api/auth/google/`. The native app must be rebuilt after changing OAuth configuration.

## 1. Google Cloud OAuth clients

Create three OAuth 2.0 client IDs in the same Google Cloud project:

- **Web application** — add `https://marketplace-tau-sand.vercel.app` as an Authorized JavaScript origin and `https://marketplace-tau-sand.vercel.app/oauthredirect` as an Authorized redirect URI if the web build uses that callback path.
- **Android** — package/application id: `com.marketplace.mobile`; add the SHA-1 certificate fingerprints used by your EAS/Play builds.
- **iOS** — bundle identifier: `com.marketplace.mobile`.

Do not put a Google client secret in the mobile app.

## 2. Mobile environment

Create `mobile/.env` from `.env.example` and set:

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

The backend must receive the same client IDs in `GOOGLE_CLIENT_IDS`, comma-separated.

## 3. EAS builds

For preview/production EAS builds, add the three `EXPO_PUBLIC_GOOGLE_*` values to the EAS environment used by the build. They are client IDs, not secrets.

After changing these values, rebuild the native application. Changing `.env` alone does not change an already-installed APK/IPA.

## 4. Backend

Set in `backend/.env`:

`GOOGLE_CLIENT_IDS=<WEB_CLIENT_ID>,<ANDROID_CLIENT_ID>,<IOS_CLIENT_ID>`

The backend verifies the Google ID token signature, issuer, expiry and audience before creating/linking the Marketplace account and issuing Marketplace JWTs.

## 5. Important native redirect note

The Expo app has the `marketplace` deep-link scheme and also adds the Google iOS reversed-client-ID scheme when the iOS client ID is present. Rebuild after changing the iOS client ID so the native URL scheme is regenerated.

Google sign-in cannot be fully validated in an already-built APK until the real Google OAuth client IDs and signing fingerprints are configured in Google Cloud.
