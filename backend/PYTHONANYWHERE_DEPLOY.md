# PythonAnywhere deployment — Marketplace

The Android app uses:

`https://emilio2026.pythonanywhere.com`

The PythonAnywhere Web app must point to this Marketplace backend, not the default Django project.

## 1. Backend location

The recommended location is:

```text
/home/emilio2026/Marketplace/marketplace/backend
```

This directory must contain:

```text
manage.py
marketplace_project/
accounts/
catalog/
orders/
reviews/
messaging/
notifications/
moderation/
core/
requirements.txt
.env
```

## 2. PythonAnywhere Bash console

```bash
cd /home/emilio2026/Marketplace/marketplace/backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py check --deploy
```

If the Web tab uses another Python version, create/use the matching version instead of `3.12`.

## 3. Required .env

Create:

`/home/emilio2026/Marketplace/marketplace/backend/.env`

At minimum:

```env
DJANGO_SECRET_KEY=REPLACE_WITH_A_LONG_RANDOM_SECRET
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=emilio2026.pythonanywhere.com
CORS_ALLOWED_ORIGINS=https://marketplace.co.ke,https://www.marketplace.co.ke
TIME_ZONE=Africa/Nairobi
```

The settings file automatically loads this `.env`.

## 4. PythonAnywhere Web tab

Create/reload a Web app using the same Python version as the virtualenv.

Set **Virtualenv** to:

```text
/home/emilio2026/Marketplace/marketplace/backend/.venv
```

Set the **WSGI configuration file** to:

```text
/home/emilio2026/Marketplace/marketplace/backend/pythonanywhere_wsgi.py
```

The complete WSGI file should be:

```python
import os
import sys

PROJECT_DIR = "/home/emilio2026/Marketplace/marketplace/backend"
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "marketplace_project.settings")
os.environ.setdefault("DJANGO_DEBUG", "false")
os.environ.setdefault(
    "DJANGO_ALLOWED_HOSTS",
    "emilio2026.pythonanywhere.com",
)

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

**Do not** leave PythonAnywhere's default WSGI contents such as `mysite.wsgi` or a tutorial project import.

## 5. Static files

In the Web tab:

```text
URL: /static/
Directory: /home/emilio2026/Marketplace/marketplace/backend/staticfiles/
```

For uploaded media:

```text
URL: /media/
Directory: /home/emilio2026/Marketplace/marketplace/backend/media/
```

Then run:

```bash
cd /home/emilio2026/Marketplace/marketplace/backend
source .venv/bin/activate
python manage.py collectstatic --noinput
```

## 6. Reload

After changing WSGI/configuration, press **Reload** in PythonAnywhere's Web tab.

## 7. Verify from Bash

First check Django itself:

```bash
cd /home/emilio2026/Marketplace/marketplace/backend
source .venv/bin/activate
python manage.py check
python manage.py shell -c "from django.conf import settings; print(settings.ROOT_URLCONF); print(settings.ALLOWED_HOSTS)"
```

Then check the public API:

```bash
curl -i https://emilio2026.pythonanywhere.com/api/health/
```

Expected response:

```json
{"status":"ok","database":"ok"}
```

If `/` still displays Django's **"The install worked successfully!"** page, the Web app is still pointing at the wrong WSGI file/project. The WSGI file above must be used and the Web app must be reloaded.

## 8. If the site returns 500

Open the PythonAnywhere Web tab and inspect **Error log**. The most useful command from Bash is:

```bash
python manage.py check
```

Then verify the virtualenv contains Django:

```bash
source /home/emilio2026/Marketplace/marketplace/backend/.venv/bin/activate
python -c "import django; print(django.get_version())"
```
