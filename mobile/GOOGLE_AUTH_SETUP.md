# Marketplace Google Authentication

Marketplace mobile Google sign-in uses the **Web OAuth client ID** and opens Google's hosted authentication page in the device's external browser. The Android app does not initialize `expo-auth-session/providers/google`, so a missing `androidClientId` cannot crash the login screen.

## Mobile flow

1. User taps **Continue with Google** in Marketplace.
2. Marketplace opens Google in the external browser/Custom Tab.
3. Google authenticates the user.
4. Google redirects to the HTTPS `/oauthredirect?native=1` bridge on the Marketplace web domain.
5. The bridge redirects to `marketplace://oauthredirect`.
6. Android returns to Marketplace.
7. Marketplace sends the returned Google ID token to Django at `/api/auth/google/`.
8. Django verifies the token and issues the normal Marketplace JWTs.

## Google Cloud configuration

For this mobile browser flow, the app uses:

- **Web application OAuth client** — required.
- **Android OAuth client** — not required by this implementation.
- **iOS OAuth client** — not required by this implementation.

In the Web OAuth client, add the exact HTTPS redirect URI used by production:

`https://marketplace-tau-sand.vercel.app/oauthredirect?native=1`

The value is stored in `EXPO_PUBLIC_GOOGLE_AUTH_REDIRECT_URI` and must exactly match the authorized redirect URI in Google Cloud.

Do not put a Google client secret in the mobile app.

## Environment variables

The mobile app needs:

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_WEB_BASE_URL`

`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` may remain in your environment for other tooling, but Marketplace mobile Google sign-in no longer depends on it.

## Expo Go

Expo Go cannot receive the `marketplace://` callback because it does not use the Marketplace native scheme. Use the Marketplace development build or production APK for Google sign-in. The normal email/password login page remains available in Expo Go.

## Backend

Django continues to verify the Google ID token at `/api/auth/google/`.

The server must allow the Web client ID in `GOOGLE_CLIENT_IDS`.

