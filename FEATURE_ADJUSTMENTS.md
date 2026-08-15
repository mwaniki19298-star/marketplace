# Marketplace feature adjustments

Implemented in `mobile/App.tsx`:

- Listing/profile/store images continue to upload **directly from the frontend to Cloudinary**.
- Django receives only Cloudinary `image_urls` / `image_public_ids`; image bytes do not pass through PythonAnywhere.
- Like and save actions now use optimistic UI, prevent rapid duplicate requests, and roll back on failure.
- Product detail now exposes the same working save/like state and uses **Message seller** for the messaging action.
- Messages now opens as a dedicated full-height experience:
  - global top navigation hidden
  - global bottom navigation hidden
  - composer is keyboard-safe
  - safe-area padding is respected
  - chat automatically scrolls to the newest message
- Existing backend endpoints for likes, saves, conversations, and messages remain the source of truth.
