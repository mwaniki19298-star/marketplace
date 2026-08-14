from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("catalog", "0007_merge_20260814_1935")]

    operations = [
        migrations.AddField(
            model_name="listingimage",
            name="seed_image_blob",
            field=models.BinaryField(blank=True, editable=False, null=True),
        ),
    ]
