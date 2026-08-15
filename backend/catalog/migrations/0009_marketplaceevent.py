from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("catalog", "0008_listingimage_seed_image_blob"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="MarketplaceEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("event", models.CharField(choices=[("view", "View"), ("like", "Like"), ("unlike", "Unlike"), ("save", "Save"), ("unsave", "Unsave"), ("share", "Share"), ("search", "Search"), ("click", "Click"), ("cart_add", "Cart add"), ("purchase", "Purchase")], max_length=20)),
                ("query", models.CharField(blank=True, max_length=200)),
                ("value", models.FloatField(blank=True, null=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("category", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="marketplace_events", to="catalog.category")),
                ("listing", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="marketplace_events", to="catalog.listing")),
                ("store", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="marketplace_events", to="catalog.store")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="marketplace_events", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddIndex(model_name="marketplaceevent", index=models.Index(fields=["user", "event", "created_at"], name="catalog_mar_user_id_6a0a42_idx")),
        migrations.AddIndex(model_name="marketplaceevent", index=models.Index(fields=["user", "listing", "created_at"], name="catalog_mar_user_id_0f1a3a_idx")),
        migrations.AddIndex(model_name="marketplaceevent", index=models.Index(fields=["user", "category", "created_at"], name="catalog_mar_user_id_3e9d5f_idx")),
        migrations.AddIndex(model_name="marketplaceevent", index=models.Index(fields=["user", "store", "created_at"], name="catalog_mar_user_id_7c7f8d_idx")),
        migrations.AddIndex(model_name="marketplaceevent", index=models.Index(fields=["event", "created_at"], name="catalog_mar_event_i_9f7f34_idx")),
    ]
