from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("messaging", "0003_conversation_buyer_typing_at_and_more"),
    ]
    operations = [
        migrations.CreateModel(
            name="Call",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("ringing", "Ringing"), ("accepted", "Accepted"), ("declined", "Declined"), ("ended", "Ended")], default="ringing", max_length=16)),
                ("offer", models.JSONField(blank=True, default=dict)),
                ("answer", models.JSONField(blank=True, default=dict)),
                ("ice_candidates", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("caller", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="calls_made", to=settings.AUTH_USER_MODEL)),
                ("conversation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="calls", to="messaging.conversation")),
                ("receiver", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="calls_received", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(model_name="call", index=models.Index(fields=["receiver", "status", "created_at"], name="calls_call_receiv_1b8f1d_idx")),
        migrations.AddIndex(model_name="call", index=models.Index(fields=["conversation", "created_at"], name="calls_call_conve_6f7d3b_idx")),
    ]
