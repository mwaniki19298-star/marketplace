# Marketplace demo seed data

This package includes `seed_marketplace_local.py` and a local sample product image.

Defaults:
- 30 users
- 1 store per user (30 stores)
- 10 products per store (300 products)
- 2-6 local ListingImage rows per product
- No Cloudinary uploads

Run from `backend/`:

```bash
python seed_marketplace_local.py --users 2 --products-per-store 3
python seed_marketplace_local.py
```

The sample image is copied to Django `MEDIA_ROOT/seed/products/sample-product.jpg` and the database stores its `/media/...` URL. Generated users use the password `MarketplaceSeed123!`.
