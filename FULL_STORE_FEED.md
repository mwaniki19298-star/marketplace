# Full-store marketplace feed

The intended feed pipeline is now:

**all active products from all stores → backend feed → paginated frontend → local discovery ranking**

The frontend requests 60 products at a time from `/api/marketplace/feed/` and can append later pages as the user scrolls.

The backend endpoint:
- includes products across all stores
- excludes inactive/deleted listings when those fields exist
- supports `page`, `page_size`, and `seed`
- gives freshness and view-count boosts
- uses a seed-controlled random component for discovery
- returns pagination metadata

For production scale, replace the Python-side full-query shuffle with a database-friendly ranking strategy once the catalog becomes large.
