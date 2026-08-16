"""PythonAnywhere WSGI entry point for Marketplace.

PythonAnywhere Web tab should point to this file:
/home/emilio2026/Marketplace/marketplace/backend/pythonanywhere_wsgi.py

If your backend is stored somewhere else, change PROJECT_DIR below.
"""

import os
import sys

# IMPORTANT: this must be the directory that contains manage.py.
PROJECT_DIR = "/home/emilio2026/Marketplace/marketplace/backend"

if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

# Load the Marketplace Django settings, not PythonAnywhere's default project.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "marketplace_project.settings")
os.environ.setdefault("DJANGO_DEBUG", "false")
os.environ.setdefault(
    "DJANGO_ALLOWED_HOSTS",
    "emilio2026.pythonanywhere.com",
)

# Django reads backend/.env itself via python-dotenv in settings.py.
from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()
