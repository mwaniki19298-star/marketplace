from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0014_default_listing_currency_kes"),
        ("messaging", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="message",
            name="listing",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="messages", to="catalog.listing"),
        ),
        migrations.AddField(
            model_name="message",
            name="product_snapshot",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
