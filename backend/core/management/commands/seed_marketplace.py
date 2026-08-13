from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from catalog.models import Category, Store, Listing

class Command(BaseCommand):
    help = "Seed a local demo Marketplace dataset."
    def handle(self, *args, **options):
        User = get_user_model()
        user, created = User.objects.get_or_create(email="demo@marketplace.local", defaults={"full_name": "Demo Seller", "is_active": True})
        if created: user.set_password("DemoPassword123!"); user.save()
        categories = ["Electronics", "Fashion", "Home & Living", "Books", "Services", "Food & Drinks", "Beauty"]
        cat_map = {}
        for name in categories:
            cat, _ = Category.objects.get_or_create(name=name, defaults={"slug": slugify(name)})
            cat_map[name] = cat
        store, _ = Store.objects.get_or_create(owner=user, name="Demo Store", defaults={"slug": "demo-store", "description": "Demo community store", "location": "Nairobi", "verification": Store.Verification.COMMUNITY})
        samples = [
            ("Samsung Galaxy A15", "Electronics", "18500.00", "A clean sample listing for the mobile feed."),
            ("Office Chair", "Home & Living", "7500.00", "Comfortable office chair in good condition."),
            ("The Purpose Driven Life", "Books", "1200.00", "A sample book listing."),
        ]
        for title, category, price, description in samples:
            Listing.objects.get_or_create(store=store, title=title, defaults={"category": cat_map[category], "slug": slugify(title), "description": description, "price": price, "location": "Nairobi"})
        self.stdout.write(self.style.SUCCESS("Marketplace demo data seeded."))
