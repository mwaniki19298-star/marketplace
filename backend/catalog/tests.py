

from django.test import TestCase
from django.urls import reverse, resolve


class MarketplaceFeedEndpointTests(TestCase):
    def test_marketplace_feed_url(self):
        match = resolve("/api/marketplace/feed/")
        self.assertEqual(match.url_name, "marketplace-feed")
