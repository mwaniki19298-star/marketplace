# Marketplace WhatsApp Share Links

The intended production flow is:

`WhatsApp -> https://YOUR_MARKETPLACE_DOMAIN/listing/123/product-name/ -> Marketplace app if installed -> web item page if not installed`

## 1. Configure the public domain

Set these variables in the backend and mobile build environment:

- `PUBLIC_WEB_BASE_URL=https://marketplace.example.com`
- `MARKETPLACE_WEB_DOMAIN=marketplace.example.com`
- `EXPO_PUBLIC_WEB_BASE_URL=https://marketplace.example.com`
- `EXPO_PUBLIC_WEB_DOMAIN=marketplace.example.com`

Do not include a trailing slash in the domain variable.

## 2. Android App Links

Set `MARKETPLACE_ANDROID_PACKAGE` to the exact Android package used by the production build and `MARKETPLACE_ANDROID_SHA256` to the SHA-256 fingerprint of the signing certificate. The backend serves `/.well-known/assetlinks.json`.

Build a new native Android binary after configuring the domain. Expo notes that Android App Links require `intentFilters` with `autoVerify: true` plus two-way website/app association.

## 3. iOS Universal Links

Set `MARKETPLACE_IOS_APP_ID` to `<APPLE_TEAM_ID>.<BUNDLE_ID>`. The backend serves `/.well-known/apple-app-site-association`. The mobile app config adds `applinks:<domain>` to `ios.associatedDomains`. Build a new iOS binary after changing this.

## 4. WhatsApp sharing

The mobile Share action now uses the public HTTPS listing URL, not only `marketplace://`. The shared message still includes the main product image as an attachment. The web listing page also has Open Graph metadata and the main product image so services such as WhatsApp can generate a rich link preview.

## 5. Important

A real HTTPS domain is required for the installed-app-or-web fallback. A custom `marketplace://` scheme alone cannot provide the web fallback when the app is not installed.
