# Marketplace seed dataset

This package contains a seed-only dataset generator designed for the local SQLite database.

## Defaults

- 30 users
- 1 store per user = 30 stores
- 10 products per store = 300 products
- 2–6 product-specific photos per product
- 60 generated JPEG source photos (6 variants for each of the 10 seeded product types)
- Seed photos are stored as SQLite BLOBs in `catalog_listingimage.seed_image_blob`
- No Cloudinary upload is performed by the seed function

## Run

From `backend/`:

```bash
python manage.py migrate
python seed_marketplace_local.py --users 2 --products-per-store 3
```

If the small test looks correct, run:

```bash
python seed_marketplace_local.py
```

The script intentionally stops if the active Django database is not SQLite. This keeps the BLOB behavior restricted to the seed/local database as requested.

## Generated users

Email range:

`seed.user001@marketplace.local` through `seed.user030@marketplace.local`

Password:

`MarketplaceSeed123!`

## Image architecture

### Seed data only

The generated JPEG bytes are inserted directly into the SQLite `ListingImage.seed_image_blob` BLOB field. The API serializer converts those bytes to a `data:image/jpeg;base64,...` value when returning a listing, so the mobile app can display the seeded photos without reading files from `MEDIA_ROOT`.

### Normal uploads

Normal listing uploads are unchanged. The mobile app uploads directly to Cloudinary using the configured frontend upload channel, then sends the Cloudinary `secure_url` and `public_id` to Django. Normal `ListingImage.seed_image_blob` values remain `NULL`.

Do not put the Cloudinary API secret in Expo/public frontend configuration.


HOTFIX
------
The seed loader now normalizes hyphens/underscores in product photo filenames,
so the Cotton T-Shirt photos are found correctly. No Cloudinary upload is used
by the seed function.

Do NOT run `makemigrations --merge` again just to seed data. If your current
database already has the generated 0009 merge migration, leave it applied.
