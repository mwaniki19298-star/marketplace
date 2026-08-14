#!/usr/bin/env python3
"""
Marketplace demo seed using EXISTING remote image URLs.

Creates by default:
  30 users
  1 store per user = 30 stores
  10 products per store = 300 products
  2-6 image URL rows per product

IMPORTANT:
- This seed script does NOT upload images to Cloudinary.
- It does NOT store image bytes in SQLite.
- It stores normal remote HTTPS image URLs in ListingImage.image.
- Normal/mobile uploads are unchanged and continue using the frontend -> Cloudinary flow.

Run from backend:
    python seed_marketplace_local.py

Test:
    python seed_marketplace_local.py --users 2 --products-per-store 3 --force-images

Full:
    python seed_marketplace_local.py --force-images
"""

import argparse
import os
import random
import sys
from urllib.parse import quote

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "marketplace_project.settings")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import django
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.text import slugify

from catalog.models import Category, Listing, ListingImage, Store

USERS = 30
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
    ("Samsung Galaxy A55", "Electronics", 45999, "samsung galaxy a55 phone"),
    ("iPhone 14", "Electronics", 69999, "iphone 14 smartphone"),
    ("HP Pavilion Laptop", "Electronics", 78000, "hp pavilion laptop"),
    ("Sony Wireless Headphones", "Electronics", 14500, "sony headphones"),
    ("Canon EOS Camera", "Electronics", 92000, "canon eos camera"),
    ("Classic Wrist Watch", "Fashion", 8500, "classic wrist watch"),
    ("Running Sneakers", "Fashion", 6500, "running sneakers shoes"),
    ("Premium Sunglasses", "Fashion", 4200, "sunglasses"),
    ("Cotton T-Shirt", "Fashion", 1800, "cotton t shirt"),
    ("Slim Fit Jeans", "Fashion", 3200, "blue jeans"),
]

# Existing remote image URL services. They return an actual image for the
# requested product category. `lock` makes each URL deterministic/different.
# No upload or API key is involved.
def image_urls(query, count):
    safe = quote(query.replace(" ", ","))
    return [
        f"https://loremflickr.com/1200/900/{safe}?lock={i + 1}"
        for i in range(count)
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


def make_categories():
    result = {}
    for name in CATEGORIES:
        category, _ = Category.objects.get_or_create(
            name=name,
            defaults={"slug": slugify(name)},
        )
        result[name] = category
    return result


def make_users(count):
    User = get_user_model()
    users = []

    for i in range(1, count + 1):
        email = f"seed.user{i:03d}@marketplace.local"
        full_name = f"{FIRST_NAMES[(i - 1) % len(FIRST_NAMES)]} SeedUser{i:03d}"

        user, created = User.objects.get_or_create(
            email=email,
            defaults={"full_name": full_name, "is_active": True},
        )

        if created:
            user.set_password(PASSWORD)
            user.save()

        users.append(user)

    return users


def seed(users, products_per_store, min_images, max_images, force_images):
    categories = make_categories()

    stores_created = 0
    products_created = 0
    images_created = 0
    images_updated = 0

    for user_index, user in enumerate(users, start=1):
        # Exactly ONE store for every seed user.
        store_name = f"{user.full_name.split()[0]}'s Marketplace Store"

        store, store_created = Store.objects.get_or_create(
            owner=user,
            defaults={
                "name": store_name,
                "slug": unique_slug(Store, f"seed-{user_index:03d}-{store_name}"),
                "description": f"Demo Marketplace store owned by {user.full_name}.",
                "location": LOCATIONS[(user_index - 1) % len(LOCATIONS)],
                "phone": f"+254700{user_index:03d}000",
                "verification": Store.Verification.COMMUNITY,
                "is_active": True,
            },
        )

        stores_created += int(store_created)

        for product_index in range(1, products_per_store + 1):
            title_base, category_name, base_price, image_query = PRODUCTS[
                (product_index - 1) % len(PRODUCTS)
            ]
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

            # Existing products from an earlier failed seed may have no images.
            # Add URLs when empty. --force-images replaces their image rows.
            existing = ListingImage.objects.filter(listing=listing).order_by("sort_order")
            if force_images:
                existing.delete()
                existing = ListingImage.objects.none()

            if not existing.exists():
                count = random.randint(min_images, max_images)
                urls = image_urls(image_query, count)

                ListingImage.objects.bulk_create([
                    ListingImage(
                        listing=listing,
                        image=url,
                        public_id="",
                        seed_image_blob=None,
                        alt_text=f"{title} photo {n + 1}",
                        sort_order=n,
                    )
                    for n, url in enumerate(urls)
                ])
                images_created += count

        print(f"User {user_index}/{len(users)} complete: {user.email}")

    return stores_created, products_created, images_created, images_updated


def main():
    parser = argparse.ArgumentParser(
        description="Seed Marketplace using existing remote product image URLs."
    )
    parser.add_argument("--users", type=int, default=USERS)
    parser.add_argument("--products-per-store", type=int, default=PRODUCTS_PER_STORE)
    parser.add_argument("--min-images", type=int, default=MIN_IMAGES)
    parser.add_argument("--max-images", type=int, default=MAX_IMAGES)
    parser.add_argument(
        "--force-images",
        action="store_true",
        help="Replace existing seed listing images with fresh remote URLs.",
    )
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

    print(
        f"Target: {args.users} users, {args.users} stores, "
        f"{args.users * args.products_per_store} products, "
        f"{args.min_images}-{args.max_images} images/product."
    )
    print("Image mode: existing remote HTTPS URLs only; no Cloudinary uploads.")

    if args.dry_run:
        print("Dry run: no database changes made.")
        return

    with transaction.atomic():
        users = make_users(args.users)
        stores, products, images, _ = seed(
            users,
            args.products_per_store,
            args.min_images,
            args.max_images,
            args.force_images,
        )

    print("\nSeed complete.")
    print(f"Users: {len(users)}")
    print(f"Stores created: {stores}")
    print(f"Products created: {products}")
    print(f"Listing image rows created: {images}")
    print(f"Password for generated users: {PASSWORD}")
    print(
        f"Emails: seed.user001@marketplace.local through "
        f"seed.user{args.users:03d}@marketplace.local"
    )
    print("Images are stored as normal remote URLs in ListingImage.image.")
    print("Normal app uploads remain frontend -> Cloudinary.")


if __name__ == "__main__":
    main()
