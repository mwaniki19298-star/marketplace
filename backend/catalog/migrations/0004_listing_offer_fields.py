from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [("catalog", "0003_listing_is_draft")]
    operations = [
        migrations.AddField(model_name="listing", name="original_price", field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
        migrations.AddField(model_name="listing", name="offer_price", field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
        migrations.AddField(model_name="listing", name="is_on_offer", field=models.BooleanField(default=False)),
    ]
