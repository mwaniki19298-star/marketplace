from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("calls", "0001_initial")]

    operations = [
        migrations.RunSQL(
            "UPDATE calls_call SET status='cancelled' WHERE status='declined'",
            reverse_sql="UPDATE calls_call SET status='declined' WHERE status='cancelled'",
        ),
        migrations.RunSQL(
            "UPDATE calls_call SET status='accepted' WHERE status='ended'",
            reverse_sql="UPDATE calls_call SET status='ended' WHERE status='accepted'",
        ),
        migrations.AlterField(
            model_name="call",
            name="status",
            field=models.CharField(
                choices=[
                    ("ringing", "Ringing"),
                    ("accepted", "Accepted"),
                    ("cancelled", "Cancelled"),
                    ("missed", "Missed"),
                ],
                default="ringing",
                max_length=16,
            ),
        ),
        migrations.AddField(model_name="call", name="accepted_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="call", name="ended_at", field=models.DateTimeField(blank=True, null=True)),
    ]
