# Marketplace

A community multi-vendor marketplace. Buyers and sellers discover each
other, communicate, and track orders on-platform — payment itself is always
arranged directly between the two parties, off-platform.

## Build phases

This repo is being built in the phases the product brief laid out, so each
piece gets real attention instead of a shallow pass across everything at
once.

- [x] **Design system + UI shell** — `mobile/` (this phase). Tokens,
      primitives, responsive shell, Home / Browse / Product detail on mock
      data. Includes both web and mobile app. See `mobile/README.md`.
- [ ] **Backend foundation** — Django/DRF project, Postgres schema, JWT +
      Google OAuth, Phase 1 API (auth, products, stores, categories).
- [ ] **Seller flow** — store creation, listing management, purchase
      request → order lifecycle, wired to the real API.
- [ ] **Reviews, recommendations, messaging, notifications, saved/following.**
- [ ] **Verification, reporting/disputes, admin dashboard, analytics.**

## Repo layout

```
mobile/     React + TypeScript + Vite + Tailwind + React Native Web (web and mobile)
backend/    Django + DRF + PostgreSQL (next phase)
```

Each side deploys independently — frontend to Vercel/Netlify, backend to
Render/Railway, with its own `.env` (see each folder's `.env.example`).

## Cloudinary setup

Create a Cloudinary product environment and add these values to `backend/.env`:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Images from the Sell page are uploaded directly to Cloudinary using a signed request prepared by Django.
