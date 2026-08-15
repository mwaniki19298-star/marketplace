# Store email verification

The **Manage store** action now requires store ownership verification by email before opening the store-profile editor.

Flow:
1. `GET /api/stores/verification-status/` checks whether the owner's email has verified the store.
2. `POST /api/stores/send-verification/` sends a six-digit code to the account email. Codes expire after 10 minutes and can be requested once per minute.
3. `POST /api/stores/confirm-verification/` verifies the code. Five failed attempts require a new code.
4. Once verified, the app shows **Update store profile** and opens the existing store-profile editor.

Configure SMTP in the backend environment using the variables in `.env.example` (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, etc.).
