# Marketplace diagnostic and fixes

## Diagnosed gaps
- Orders page was a visual empty state even though the Django orders API already existed.
- Notifications page was a visual empty state even though notification APIs already existed.
- Product detail "Request purchase" only displayed a success alert; it did not create an order.
- Seller/buyer order lifecycle was not exposed in the frontend.
- Backend purchase requests lacked validation for self-purchase, unavailable/draft listings, and stock limits.
- Order transitions did not reserve/release inventory safely.
- New orders and messages did not create notification records.

## Implemented
### Frontend (`mobile/App.tsx`)
- Added a real purchase-request sheet with quantity, fulfilment and buyer message.
- Wired purchase requests to `POST /api/orders/`.
- Added a functional Orders page:
  - loads orders
  - seller accept/decline
  - seller preparing/ready/complete transitions
  - buyer cancellation while pending
  - buyer receipt confirmation
  - refresh and loading/error states
- Added a functional Notifications page:
  - loads notifications
  - marks individual notifications read
  - marks all notifications read
  - loading and empty states

### Backend
- Added purchase-request validation.
- Added order notifications for new requests and status changes.
- Added message notifications.
- Added stock checks and transactional inventory decrement when an order is accepted.
- Restores inventory when an accepted/preparing order is cancelled.
- Validates receipt confirmation state.

## Verification
- Backend Python files pass `compileall`.
- TypeScript parsing was checked with the available compiler; the remaining compiler errors are dependency/type-definition setup errors because the uploaded project does not contain its installed `node_modules`/Expo base config, not syntax errors in `App.tsx`.
