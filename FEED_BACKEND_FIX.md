# Backend feed fix

The previous update accidentally inserted:

    from .views import marketplace_feed

into `marketplace_project/urls.py`.

There is no `marketplace_project.views`, which caused:

    ModuleNotFoundError: No module named 'marketplace_project.views'

This version correctly imports the feed from:

    catalog.views

The endpoint is:

    GET /api/marketplace/feed/

It includes all active, non-draft listings from all active stores before pagination. It ranks by freshness, views, featured status, and existing user likes/saves, with a session seed for controlled random discovery.

The Django development-server warning is normal during local development and is unrelated to this crash.
