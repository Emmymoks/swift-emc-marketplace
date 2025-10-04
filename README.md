# Swift EMC Marketplace (Scaffold)

This repository contains a full-stack scaffold for **Swift EMC Marketplace**.

Structure:
- `backend/` - Express + MongoDB + Socket.IO API
- `frontend/` - Vite + React frontend

Key features implemented:
- User signup/login with security question for recovery.
- Users must complete profile (profile photo, bio, location) via `/api/auth/profile`.
- Listings creation; listings are created as `approved: false` and require admin approval.
- Admin panel accessible at `/Adminpanel` (hidden from nav). Provide admin secret (ADMIN_PASSWORD) as HTTP header `x-admin-secret` to perform actions.
- Instant messaging via Socket.IO and persistent messages stored in MongoDB.
- Reviews on listings.
- Basic i18n and currency fields are present (wiring requires additional services for auto-detection).
- Admin customer chat and premium listing placeholder are included as stubs.

## How to run locally

### Backend
1. `cd backend`
2. Copy `.env.example` to `.env` and update values.
3. `npm install`
4. `npm run dev`

### Frontend
1. `cd frontend`
2. `npm install`
3. Create `.env` with `VITE_API_URL` pointing to your backend (e.g. http://localhost:5000)
4. `npm run dev`

## Deployment
- Frontend: Deploy to Vercel (connect the `frontend` folder). Set environment variable `VITE_API_URL` to your backend URL.
- Backend: Deploy to Render (or any Node host). Set environment variables from `.env`.

## Notes & Next steps
- For production image uploads use Cloudinary or S3; currently images can be sent as base64 strings.
- For currency-by-location and translation, integrate a geolocation API and i18next language switcher. The scaffold includes fields to store user currency and language.
- For payments (premium ads) integrate Stripe on test mode; the UI includes a placeholder for "coming soon".
- Make sure to secure admin endpoints better before production (use role-based auth).

This scaffold is intended to be a complete starting point. Customize UI/UX, add tests, and integrate production services (image storage, payments, CDN) before going live.
