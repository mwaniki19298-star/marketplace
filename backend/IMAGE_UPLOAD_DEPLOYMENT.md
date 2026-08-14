# Cloudinary image upload deployment

## Required PythonAnywhere environment variables

Set these server-side only:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_MAX_IMAGE_BYTES=10485760` (optional; default is 10 MiB)

Never put `CLOUDINARY_API_SECRET` in Expo/mobile environment variables.

## Database

From the backend directory:

```bash
python manage.py migrate
python manage.py check
```

The image metadata migration is `catalog.0004_listingimage_cloudinary_public_id`.

## PythonAnywhere reload

After updating the files and environment variables, reload the PythonAnywhere web application from the Web tab so uWSGI loads the new Django code.

## Mobile

The mobile app now requests a signed upload, uploads directly to Cloudinary using multipart/form-data, receives `secure_url` and `public_id`, and sends both to the listing API.

Rebuild the Android app after updating the mobile source:

```bash
npx eas-cli build --platform android --profile preview
```

## Verification

A complete production upload cannot be claimed from an offline development environment without a valid authenticated account and live Cloudinary credentials. Verify the real flow in this order:

1. Login and obtain JWT.
2. `POST /api/media/cloudinary/sign/`.
3. Upload a small JPEG/PNG/WEBP to Cloudinary.
4. Confirm Cloudinary returns `secure_url` and `public_id`.
5. Create a listing with `image_urls` and `image_public_ids`.
6. Retrieve the listing and confirm both values are present.
7. Open the HTTPS `secure_url` from the Android app.
