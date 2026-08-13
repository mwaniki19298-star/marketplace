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
