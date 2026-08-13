# Migration fix

The backend was missing application migration files. Django had applied only the built-in migrations, so the custom `accounts_user` table did not exist.

Fresh setup:

```powershell
python manage.py migrate
python manage.py createsuperuser
```

For an existing local SQLite database that already has the built-in Django migrations recorded, back it up and reset it:

```powershell
copy db.sqlite3 db.sqlite3.backup
Remove-Item db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

Do not delete a production database. Use a proper migration/data-repair plan there.
