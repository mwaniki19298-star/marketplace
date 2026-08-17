from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [("reviews", "0001_initial")]
    operations = [migrations.AddField(model_name="review", name="photo_url", field=models.URLField(blank=True, null=True))]
