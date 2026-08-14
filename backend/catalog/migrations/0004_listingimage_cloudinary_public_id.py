from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("catalog", "0003_listing_is_draft")]

    operations = [
        migrations.AddField(
            model_name="listingimage",
            name="public_id",
            field=models.CharField(blank=True, max_length=512),
        ),
    ]
