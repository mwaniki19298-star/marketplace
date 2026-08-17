# Marketplace Google Authentication

Marketplace uses `expo-auth-session/providers/google` for browser-based Google OAuth and sends the resulting Google ID token to Django at `/api/auth/google/`.

## Supported environments

- **Web:** Google login is supported using the Web OAuth client.
- **Android/iOS development build:** Google login is supported using the platform OAuth client and the app's native AuthSession redirect.
- **Expo Go:** Google OAuth is intentionally disabled in the mobile UI for SDK 54. Expo's current authentication guidance says Expo Go cannot be used for local OAuth/OIDC testing because the app scheme cannot be customized. Use the Marketplace development build instead. This avoids misleading `redirect_uri_mismatch` errors.

## Google Cloud clients

Create/configure:

1. **Web application client** — used by the web build. Add the production web origin and callback used by the web app.
2. **Android client** — package name `com.marketplace.mobile`; add the SHA-1 fingerprints for the EAS/Play certificates used to sign the builds you test.
3. **iOS client** — bundle identifier `com.marketplace.mobile`.

Do not put a Google client secret in the mobile app.

## Environment variables

Set:

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

The backend should accept the same client IDs through `GOOGLE_CLIENT_IDS`, comma-separated.

## Native redirect behavior

The app now lets `expo-auth-session/providers/google` determine the native redirect for Android/iOS instead of forcing a custom redirect in JavaScript. This is important because the provider uses the native application identifier for standalone/development builds, while Expo Go has a different runtime environment.

For general app deep links, the project continues to use the `marketplace://` scheme.

## Testing

### Web

```bash
npx expo start --web
```

### Android development build

```bash
npm install
npm run build:android:development-device
```

Install the resulting development APK, then run:

```bash
npx expo start --dev-client --clear
```

Open the Marketplace development client, not Expo Go.

### If Google fails in the native build

The most important Android checks are:

- package name is exactly `com.marketplace.mobile`;
- the Android OAuth client belongs to the same Google Cloud project as the Web client;
- the SHA-1 fingerprint for the certificate that signed the APK is registered on that Android OAuth client;
- the Android client ID in `.env` is the same client configured in Google Cloud;
- rebuild the native app after changing `app.config.js` or native OAuth configuration.

## Backend

Set:

`GOOGLE_CLIENT_IDS=<WEB_CLIENT_ID>,<ANDROID_CLIENT_ID>,<IOS_CLIENT_ID>`

The Django endpoint verifies the Google ID token's signature, issuer, expiry, and audience before creating/linking the Marketplace account and issuing Marketplace JWTs.
