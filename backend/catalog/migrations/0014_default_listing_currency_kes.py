from django.db import migrations


def set_legacy_currency_to_kes(apps, schema_editor):
    Listing = apps.get_model("catalog", "Listing")
    Listing.objects.filter(currency__isnull=True).update(currency="KES")
    Listing.objects.filter(currency="").update(currency="KES")


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [("catalog", "0013_rename_catalog_car_user_id_8c3d2b_idx_catalog_car_user_id_04d340_idx_and_more")]
    operations = [migrations.RunPython(set_legacy_currency_to_kes, noop)]
