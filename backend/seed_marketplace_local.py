#!/usr/bin/env python3
"""
Seed a local Marketplace demo dataset WITHOUT Cloudinary uploads.

Defaults:
  30 users
  1 store per user (30 stores total)
  10 products per store (300 products total)
  2-6 ListingImage rows per product

Seed images are stored as SQLite BLOBs in ListingImage.seed_image_blob.
Normal/mobile uploads are NOT changed and continue to use Cloudinary URLs.
No Cloudinary API calls are made by this seed function.

Run from the Django backend directory:
  python seed_marketplace_local.py

Optional:
  python seed_marketplace_local.py --users 5 --products-per-store 10
"""

import argparse
import os
import random
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "marketplace_project.settings")
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import django
django.setup()

from django.conf import settings
from django.db import connection
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.text import slugify

from catalog.models import Category, Listing, ListingImage, Store

USERS = 30
STORES_PER_USER = 1
PRODUCTS_PER_STORE = 10
MIN_IMAGES = 2
MAX_IMAGES = 6
PASSWORD = "MarketplaceSeed123!"

FIRST_NAMES = [
    "Amani", "Brian", "Carol", "David", "Emmanuel", "Faith", "George", "Hannah",
    "Ian", "Joy", "Kevin", "Linda", "Martin", "Naomi", "Oscar", "Purity",
    "Quincy", "Ruth", "Samuel", "Terry", "Victor", "Wanjiku", "Xavier", "Yvonne",
    "Zawadi", "Daniel", "Mercy", "Collins", "Esther", "Felix",
]

LOCATIONS = [
    "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Kitengela",
    "Machakos", "Nyeri", "Meru", "Kakamega", "Naivasha", "Malindi", "Voi",
]

PRODUCTS = [
    ("Samsung Galaxy A55", "Electronics", 45999),
    ("iPhone 14", "Electronics", 69999),
    ("HP Pavilion Laptop", "Electronics", 78000),
    ("Sony Wireless Headphones", "Electronics", 14500),
    ("Canon EOS Camera", "Electronics", 92000),
    ("Classic Wrist Watch", "Fashion", 8500),
    ("Running Sneakers", "Fashion", 6500),
    ("Premium Sunglasses", "Fashion", 4200),
    ("Cotton T-Shirt", "Fashion", 1800),
    ("Slim Fit Jeans", "Fashion", 3200),
    ("Leather Backpack", "Fashion", 5500),
    ("Ergonomic Office Chair", "Home & Living", 18500),
    ("Three-Seater Sofa", "Home & Living", 68000),
    ("Modern Table Lamp", "Home & Living", 3800),
    ("Indoor Plant", "Home & Living", 2200),
    ("The Alchemist", "Books", 1200),
    ("Business Strategy Book", "Books", 2500),
    ("Match Football", "Sports", 2800),
    ("Mountain Bicycle", "Sports", 32000),
    ("Professional Tool Kit", "Home & Living", 12500),
    ("Fresh Coffee Beans", "Food & Drinks", 1800),
    ("Celebration Cake", "Food & Drinks", 3500),
    ("Luxury Perfume", "Beauty", 8500),
    ("Makeup Essentials Kit", "Beauty", 6200),
]

CATEGORIES = sorted({item[1] for item in PRODUCTS})


def unique_slug(model, base):
    base = slugify(base)[:180] or "item"
    slug = base
    number = 2
    while model.objects.filter(slug=slug).exists():
        slug = f"{base}-{number}"
        number += 1
    return slug


def load_photo_pool():
    """Load generated product-specific JPEGs that will be stored as SQLite BLOBs."""
    source_dir = BACKEND_DIR / "seed_assets" / "products"
    if not source_dir.exists():
        raise FileNotFoundError(f"Missing seed photo directory: {source_dir}")

    pool = {}
    # Index the directory by a normalized product name so filenames such as
    # cotton_t-shirt_1.jpg and cotton_t_shirt_1.jpg are both accepted.
    indexed = {}
    for path in sorted(source_dir.glob("*.jpg")):
        stem = path.stem
        if "_" not in stem:
            continue
        product_key = stem.rsplit("_", 1)[0]
        normalized = product_key.replace("-", "_").lower()
        indexed.setdefault(normalized, []).append(path)

    for title_base, _, _ in PRODUCTS[:10]:
        key = slugify(title_base).replace("-", "_").lower()
        files = indexed.get(key, [])
        if len(files) < 2:
            raise FileNotFoundError(
                f"Need at least 2 generated photos for {title_base}; "
                f"found {len(files)} in {source_dir}. "
                f"Expected filenames like {key}_1.jpg ..."
            )
        pool[title_base] = [f.read_bytes() for f in files[:6]]
    return pool


def make_users(count):
    User = get_user_model()
    users = []

    for i in range(1, count + 1):
        email = f"seed.user{i:03d}@marketplace.local"
        name = f"{FIRST_NAMES[(i - 1) % len(FIRST_NAMES)]} SeedUser{i:03d}"

        user, created = User.objects.get_or_create(
            email=email,
            defaults={"full_name": name, "is_active": True},
        )

        if created:
            user.set_password(PASSWORD)
            user.save()

        users.append(user)

    return users


def make_categories():
    result = {}
    for name in CATEGORIES:
        category, _ = Category.objects.get_or_create(
            name=name,
            defaults={"slug": slugify(name)},
        )
        result[name] = category
    return result


def seed(users, products_per_store, min_images, max_images):
    categories = make_categories()
    photo_pool = load_photo_pool()

    stores_created = 0
    products_created = 0
    images_created = 0

    for user_index, user in enumerate(users, start=1):
        # Exactly ONE store per user.
        store_name = f"{user.full_name.split()[0]}'s Marketplace Store"
        store_slug = unique_slug(Store, f"seed-{user_index:03d}-{store_name}")

        store, store_created = Store.objects.get_or_create(
            owner=user,
            name=store_name,
            defaults={
                "slug": store_slug,
                "description": f"Demo Marketplace store owned by {user.full_name}.",
                "location": LOCATIONS[(user_index - 1) % len(LOCATIONS)],
                "phone": f"+254700{user_index:03d}000",
                "verification": Store.Verification.COMMUNITY,
                "is_active": True,
            },
        )

        stores_created += int(store_created)

        for product_index in range(1, products_per_store + 1):
            title_base, category_name, base_price = PRODUCTS[(product_index - 1) % len(PRODUCTS)]
            title = f"{title_base} #{user_index:02d}-{product_index:02d}"

            listing, created = Listing.objects.get_or_create(
                store=store,
                title=title,
                defaults={
                    "category": categories[category_name],
                    "slug": unique_slug(Listing, title),
                    "description": (
                        f"Quality {title_base.lower()} available from {store.name}. "
                        "Demo inventory for Marketplace testing."
                    ),
                    "price": base_price + random.randint(-500, 1500),
                    "currency": "KES",
                    "negotiable": random.choice([False, True]),
                    "condition": random.choice([
                        Listing.Condition.NEW,
                        Listing.Condition.NEW,
                        Listing.Condition.REFURBISHED,
                    ]),
                    "stock": random.randint(1, 30),
                    "location": store.location,
                    "tags": [category_name.lower(), "demo", "seeded"],
                    "is_available": True,
                    "is_featured": random.random() < 0.08,
                    "is_draft": False,
                },
            )

            products_created += int(created)

            # Give every product 2-6 product-specific image rows. The JPEG bytes are stored in SQLite.
            if created or not listing.images.exists():
                ListingImage.objects.filter(listing=listing).delete()

                count = random.randint(min_images, min(max_images, 6))
                variants = photo_pool[title_base]
                chosen = random.sample(variants, k=min(count, len(variants)))
                ListingImage.objects.bulk_create([
                    ListingImage(
                        listing=listing,
                        # Seed marker only. The real image bytes are in seed_image_blob.
                        image=f"/seed-db/{listing.pk}/{n + 1}.jpg",
                        public_id="seed-local",
                        seed_image_blob=blob,
                        alt_text=f"{title} product photo {n + 1}",
                        sort_order=n,
                    )
                    for n, blob in enumerate(chosen)
                ])

                images_created += count

        print(f"User {user_index}/{len(users)} complete: {user.email}")

    return stores_created, products_created, images_created


def main():
    parser = argparse.ArgumentParser(
        description="Seed Marketplace with 1 store per user and local sample product images."
    )
    parser.add_argument("--users", type=int, default=USERS)
    parser.add_argument("--products-per-store", type=int, default=PRODUCTS_PER_STORE)
    parser.add_argument("--min-images", type=int, default=MIN_IMAGES)
    parser.add_argument("--max-images", type=int, default=MAX_IMAGES)
    parser.add_argument("--dry-run", action="store_true")

    args = parser.parse_args()

    if args.users < 1:
        parser.error("--users must be >= 1")
    if args.products_per_store < 1:
        parser.error("--products-per-store must be >= 1")
    if args.min_images < 2:
        parser.error("--min-images must be >= 2")
    if args.max_images < args.min_images:
        parser.error("--max-images must be >= --min-images")
    if args.max_images > 6:
        parser.error("--max-images must be <= 6")

    if connection.vendor != "sqlite":
        parser.error(
            "This seed is intentionally SQLite-only because seed photos are stored as BLOBs in db.sqlite3. "
            f"Current database vendor: {connection.vendor}."
        )

    print(
        f"Target: {args.users} users, {args.users} stores, "
        f"{args.users * args.products_per_store} products, "
        f"{args.min_images}-{args.max_images} images/product."
    )
    print("Image mode: SQLite seed BLOBs only (no Cloudinary upload).")

    if args.dry_run:
        print("Dry run: no database or file changes made.")
        return

    with transaction.atomic():
        users = make_users(args.users)
        stores, products, images = seed(
            users,
            args.products_per_store,
            args.min_images,
            args.max_images,
        )

    print("\nSeed complete.")
    print(f"Users: {len(users)}")
    print(f"Stores created: {stores}")
    print(f"Products created: {products}")
    print(f"Listing image rows created: {images}")
    print(f"Password for generated users: {PASSWORD}")
    print("Emails: seed.user001@marketplace.local through "
          f"seed.user{args.users:03d}@marketplace.local")
    print("Seed photos are stored as SQLite BLOBs in ListingImage.seed_image_blob; no Cloudinary uploads were made.")


if __name__ == "__main__":
    main()
