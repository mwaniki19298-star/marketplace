# Direct Cloudinary Upload Setup

The mobile app now uploads listing/profile/store images **directly from the Expo/Android client to Cloudinary**.

Flow:

```text
Android / Expo
   |
   | multipart/form-data + upload_preset
   v
Cloudinary
   |
   | secure_url + public_id
   v
Django listing/profile/store API
```

Django is **not** in the image-byte upload path.

## 1. Create an unsigned Cloudinary upload preset

In Cloudinary Console:

1. Open **Settings → Upload → Upload presets**.
2. Create a new preset.
3. Set **Signing Mode** to **Unsigned**.
4. Restrict the preset to images.
5. Allowed formats: `jpg,jpeg,png,webp`.
6. Set a reasonable maximum file size (the app also rejects files over 10 MB).
7. Use a folder such as `marketplace/mobile`.
8. Do not enable arbitrary transformations or settings you do not need.

The preset name is safe to expose to the mobile app. A Cloudinary API secret is **not** safe to expose.

## 2. Mobile environment variables

Create `mobile/.env` for local builds:

```text
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset-name
```

Keep these public values separate from the backend-only variables:

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Never put `CLOUDINARY_API_SECRET` in the mobile `.env`, `EXPO_PUBLIC_*`, `app.json`, or `app.config.js`.

## 3. EAS builds

For an EAS build, configure the two public variables in the EAS environment used by the build, or in the build environment before running:

```bash
export EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
export EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset-name
npx eas-cli build --platform android --profile preview
```

## 4. What Django receives

After Cloudinary succeeds, the app sends the returned values to the existing listing API:

```json
{
  "image_urls": [
    "https://res.cloudinary.com/.../image/upload/.../photo.jpg"
  ],
  "image_public_ids": [
    "marketplace/mobile/abc123"
  ]
}
```

Django validates that listing image URLs are HTTPS Cloudinary URLs and stores the URL/public ID. It does not upload the image itself.

## 5. Why this fixes PythonAnywhere → Cloudinary failures

The previous seeding/upload attempt failed because PythonAnywhere could not establish the outbound connection to `api.cloudinary.com:443`.

With this mobile flow, the Android device makes the Cloudinary upload request directly. PythonAnywhere only handles the small JSON listing request after the upload.

## 6. Test

After rebuilding the APK:

1. Sign in.
2. Create a listing.
3. Select 2–6 photos.
4. Publish.
5. Confirm each photo reaches Cloudinary.
6. Confirm the listing API receives `image_urls` and `image_public_ids`.
7. Open the listing and verify the images load.

The app displays a configuration error if either public Cloudinary mobile variable is missing.
