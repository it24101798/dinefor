# DineFor Release 3 FINAL — Combined Completion Bundle

This bundle combines the remaining Release 3 work into one overlay. It contains only changed and newly created project files.

## Included stages

### 3.6 — Map Experience Correction
- Full-map-first layout.
- No permanent hotel/results sidebar.
- All mapped hotels shown by default.
- Floating search and filters.
- Price/rating/review/dining-type marker modes.
- Area, budget, rating, review-count, dining-type and sort filters.
- Selected hotel/buffet preview card on the map.
- Mobile-native map layout and bottom-sheet filters.
- Safe-area handling and no intentional body-level horizontal overflow.

### 3.7 — Reservation Communications & Reminder Automation
- Production scheduler foundation for booking reminders.
- 24-hour reminder.
- 1-hour reminder.
- Buffet-started notification/email.
- Buffet-completed/review-request notification/email.
- More reliable timing so a scheduler delay does not silently miss events.
- Automatic dining/completed timeline updates for appropriate bookings.
- Existing booking communication and notification deduplication preserved.

### 3.8 — Partnership Agreement Engine
- Versioned hotel partnership agreements.
- Immutable commercial/legal snapshot per version.
- Agreement number and terms fingerprint.
- DineFor commission snapshot.
- Settlement-cycle snapshot.
- Cancellation/refund/responsibility/data/content/termination terms.
- Admin generate agreement.
- Admin send agreement by DineFor email.
- Hotel download generated PDF.
- Hotel acknowledgement.
- Protected signed-agreement upload.
- Admin signed-document verification.
- Agreement verification gate before a new partnership can be activated.
- Existing compliance-document security retained.

## New files
- client/src/components/map/ExploreMap.css
- server/models/HotelPartnershipAgreement.js
- server/services/partnershipAgreementService.js
- server/services/bookingReminderScheduler.js

## Modified files
- client/src/pages/ExploreMap.jsx
- client/src/components/map/MapView.jsx
- client/src/pages/PartnershipCompliance.jsx
- client/src/pages/AdminPartnershipReview.jsx
- server/controllers/partnershipController.js
- server/routes/partnershipRoutes.js
- server/services/bookingReminderService.js
- server/services/emailService.js
- server/server.js
- server/package.json
- server/.env.example

## Important install step

A new backend dependency is used for agreement PDF generation.

After overlaying the bundle:

```cmd
cd server
npm install
```

This installs `pdfkit` and updates your local package lock.

Then:

```cmd
npm run dev
```

In another terminal:

```cmd
cd client
npm run build
npm run dev
```

## Production reminder configuration

For production, add to `server/.env`:

```env
DINEFOR_COMMISSION_RATE=5
BOOKING_REMINDERS_ENABLED=true
BOOKING_REMINDER_INTERVAL_MINUTES=5
```

For local development, keep `BOOKING_REMINDERS_ENABLED=false` unless you intentionally want real reminder emails to be sent from the local machine.

## Build validation performed

- Updated React/JSX files: Babel parser PASS.
- Updated backend JavaScript files: `node --check` PASS.
- Full Vite production build could not be completed in the Linux build sandbox because the supplied project contains Windows Rollup optional binaries. Run `npm run build` on the user's Windows project after overlay.
