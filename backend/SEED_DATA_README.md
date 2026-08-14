# Marketplace seed image update

The seed function now uses existing remote HTTPS image URLs only.

It does NOT:
- upload seed images to Cloudinary
- put seed image bytes into SQLite
- require Cloudinary credentials

It DOES:
- create 1 store per seed user
- create the requested products
- create 2-6 ListingImage rows per product
- store remote image URLs in ListingImage.image

For existing products created by an earlier seed, use:

    python seed_marketplace_local.py --users 20 --products-per-store 7 --force-images

For the full dataset:

    python seed_marketplace_local.py --force-images

The normal mobile upload path remains frontend -> Cloudinary.
