# Mobile API Contract

The existing Expo client can gradually replace local mock state with these endpoints.

## Auth
- `POST /api/auth/register/` — `{email, full_name, password, password_confirm}`
- `POST /api/auth/login/` — `{email, password}`
- `POST /api/auth/google/` — `{id_token}`
- `GET /api/auth/me/` — current user

JWT header for protected calls:

`Authorization: Bearer <access_token>`

## Home / Browse
- `GET /api/listings/feed/`
- `GET /api/listings/?search=phone&kind=product&category=1&ordering=-created_at`
- `GET /api/categories/`
- `GET /api/stores/`
- `GET /api/stores/{id}/listings/`

## Product / Store
- `GET /api/listings/{id}/`
- `POST /api/listings/{id}/save_item/`
- `DELETE /api/listings/{id}/save_item/`
- `GET /api/listings/saved/`
- `POST /api/stores/{id}/follow/`
- `DELETE /api/stores/{id}/follow/`

## Seller
- `POST /api/stores/`
- `POST /api/listings/`
- `PATCH /api/listings/{id}/`
- `DELETE /api/listings/{id}/`

## Purchases
- `POST /api/orders/`
- `GET /api/orders/`
- `POST /api/orders/{id}/transition/` — `{status: "accepted"}` etc.
- `POST /api/orders/{id}/confirm_received/`

Payment is deliberately outside the platform.

## Reviews / recommendations
- `POST /api/reviews/`
- `GET /api/reviews/`
- `POST /api/recommendations/`
- `DELETE /api/recommendations/{id}/`

Reviews should only be submitted after a completed order.

## Messaging
- `POST /api/conversations/` — `{seller, store}`
- `GET /api/conversations/` — returns the current user's conversations with participant/store names, avatars, last message and unread count
- `POST /api/conversations/` — `{seller, store}`; returns an existing matching conversation or creates one
- `POST /api/messages/` — `{conversation, body}`
- `GET /api/messages/?conversation=<id>`
- `PATCH /api/messages/{id}/` — `{is_read: true}` for marking a conversation message as read

## Notifications
- `GET /api/notifications/`
- `POST /api/notifications/{id}/read/`
- `POST /api/notifications/mark_all_read/`

## Moderation
- `POST /api/reports/`
- `GET /api/reports/`

## Health
- `GET /api/health/`

## Account, Preferences & Support APIs

All endpoints below require the existing `Authorization: Bearer <access-token>` header unless marked public.

### Preferences
- `GET /api/auth/preferences/`
- `PATCH /api/auth/preferences/` with `{ "settings": { ... } }`
- `DELETE /api/auth/preferences/` resets preferences to defaults.

### Notification preferences
- `GET /api/auth/notification-preferences/`
- `PATCH /api/auth/notification-preferences/` with `{ "settings": { ... } }`
- `DELETE /api/auth/notification-preferences/` resets preferences to defaults.

### Password & account security
- `POST /api/auth/change-password/` with `current_password`, `new_password`, `new_password_confirm`.
- `POST /api/auth/password-reset/` with `email` (public; response does not reveal whether the account exists).
- `POST /api/auth/password-reset/confirm/` with `uid`, `token`, `new_password`, `new_password_confirm` (public).
- `POST /api/auth/sign-out-all/` revokes all outstanding refresh tokens for the authenticated user.

### Account management
- `GET /api/auth/export-data/` returns the authenticated user's account data as JSON.
- `POST /api/auth/delete-account/` with `confirmation: "DELETE"` and optional password verification.

### Reports & support
`POST /api/reports/` now supports both general problem reports and targeted marketplace reports. A general problem report may use `category`, `reason` (optional; defaults to category), and `description` without a listing/user target. Targeted reports can include `listing`, `reported_user`, `store`, or `order` and require a reason.

### Notification history
- `POST /api/notifications/mark_all_read/` marks all notifications read.
- `DELETE /api/notifications/clear_history/` permanently clears the authenticated user's notification history.

Backend-dependent operations are implemented as real endpoints; the API never returns a fake success for an unavailable operation.

## Cloudinary image upload

`POST /api/media/cloudinary/sign/` requires `Authorization: Bearer <access_token>`.

Request JSON:
```json
{"type":"listing"}
```

Response contains `cloud_name`, `api_key`, `timestamp`, `signature`, `folder`, `allowed_formats`, `max_file_size`, and `resource_type`. The Cloudinary API secret is never returned.

The mobile client then performs a signed multipart upload directly to Cloudinary. The signed fields must be echoed unchanged. Cloudinary returns `secure_url` and `public_id`.

Listing create/update accepts:
```json
{
  "image_urls": ["https://res.cloudinary.com/..."],
  "image_public_ids": ["marketplace/listings/user_123/..."]
}
```
`image_public_ids` is optional for backwards compatibility, but when supplied it must contain one ID per URL. Listing image records persist both values.

Accepted image formats: JPEG/JPG, PNG, WEBP. Application-side maximum: 10 MiB by default (`CLOUDINARY_MAX_IMAGE_BYTES`).
