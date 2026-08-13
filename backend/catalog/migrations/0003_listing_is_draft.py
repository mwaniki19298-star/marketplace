from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [("catalog", "0002_cloudinary_listing_images")]
    operations = [migrations.AddField(model_name="listing", name="is_draft", field=models.BooleanField(default=False))]
