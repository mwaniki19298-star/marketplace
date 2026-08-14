from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_merge_0002_alter_user_managers_0002_profile_edit"),
        ("moderation", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="report",
            name="category",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="report",
            name="reported_user",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reports_against", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name="report",
            name="description",
            field=models.TextField(blank=True),
        ),
    ]
