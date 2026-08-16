# Production environment checklist

- Mobile API: `https://emilio2026.pythonanywhere.com`
- Public web: `https://marketplace.co.ke`
- CORS: only the production web origins
- Django DEBUG: false
- EAS production/preview/development profiles: production API and public client configuration
- Real Django secret, Cloudinary API secret, and SMTP password must be supplied by the deployment environment; they are intentionally not included in this archive.
- The previous project archive contained credential-like values in `backend/.env`. Those values should be rotated before production deployment.
- For real WebRTC calls across restrictive networks, configure TURN credentials in the call ICE server configuration.
