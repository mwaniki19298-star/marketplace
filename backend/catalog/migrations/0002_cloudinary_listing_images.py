# Generated manually for Cloudinary-backed listing image URLs.
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("catalog", "0001_initial")]

    operations = [
        migrations.AlterField(
            model_name="listingimage",
            name="image",
            field=models.URLField(max_length=1200),
        ),
    ]
