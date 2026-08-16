from django.db import migrations, models


def backfill_order_prices(apps, schema_editor):
    PurchaseRequest = apps.get_model("orders", "PurchaseRequest")
    for order in PurchaseRequest.objects.select_related("listing").all().iterator():
        order.unit_price = order.listing.price or 0
        order.currency = order.listing.currency or "KES"
        order.save(update_fields=["unit_price", "currency"])


class Migration(migrations.Migration):
    dependencies = [("orders", "0001_initial")]
    operations = [
        migrations.AddField(
            model_name="purchaserequest",
            name="unit_price",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="purchaserequest",
            name="currency",
            field=models.CharField(default="KES", max_length=3),
        ),
        migrations.RunPython(backfill_order_prices, migrations.RunPython.noop),
    ]
