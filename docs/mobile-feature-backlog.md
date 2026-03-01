# Mobile Feature Backlog (Rider + Driver)

This document maps requested mobile features to current project status and defines a practical implementation order.

## Current baseline (already present)

- Auth login for rider/passenger via `/api/auth/login`
- Rider registration via `/api/rider/register`
- Rider availability + trip status updates
- Passenger nearby riders, fare estimate, and trip request
- Basic map usage in passenger flow
- Core trip lifecycle + payment capture on backend

## Gap matrix

Legend: `Done`, `Partial`, `Missing`

1. User registration and profile management: `Partial`
- Done: rider registration, basic login
- Missing: passenger sign-up, social login, editable profile, photo upload, payment method vaulting, driver document upload UX

2. Role selection and switching: `Partial`
- Done: one app supports both rider/passenger by role
- Missing: explicit role switcher UI and seamless mode switch in-app

3. Geolocation and maps: `Partial`
- Done: passenger map, geocoding, nearby rider markers
- Missing: continuous driver location streaming, navigation handoff, traffic/closure overlays for both roles

4. Ride request and availability: `Partial`
- Done: passenger ride request + fare estimate; rider availability + trip status updates
- Missing: ride type selector, accept/decline workflow UX, in-app rider-driver messaging/calling

5. Real-time ride tracking: `Missing`
- Missing: socket/pub-sub live tracking, live ETA updates for both roles

6. Fare calculation and payment: `Partial`
- Done: fare estimate endpoint; backend payment capture baseline
- Missing: rider payment method management, receipts in app, driver earnings/cashout views

7. Ratings and reviews: `Missing`
- Missing: post-trip rating flow, feedback storage/display, average rating surfacing

8. Push notifications: `Partial`
- Done: backend notification domain skeleton
- Missing: mobile push token registration + event triggers + notification center UX

9. Ride cancellation: `Partial`
- Done: lifecycle supports cancelled state
- Missing: rider/driver cancel APIs + cancellation policy/fee logic + UI states

10. Emergency and safety: `Missing`
- Missing: SOS button, trusted contact sharing, emergency alert workflow

11. Support and help center: `Missing`
- Missing: FAQ/help UI, issue ticket creation from mobile, live chat integration

12. Ride history: `Partial`
- Done: backend monitoring/history data exists in admin scope
- Missing: rider/driver history endpoints and mobile history screens + receipt download

13. Referral program: `Missing`

14. In-app communication (text/call): `Missing`

15. Language and localization: `Missing`

16. Admin dashboard and backend: `Partial`
- Done: super-admin and tenant-admin dashboards + monitoring endpoints
- Missing: full dispute/suspension workflows and deeper operational tooling

17. Promotions and discounts: `Missing`
- Missing: promo model, redemption API, mobile apply-code UX

## Recommended delivery phases

### Phase 1: Complete core ride loop (highest priority)

- Role switcher UX in mobile app
- Rider/driver cancellation APIs + UI + fee policy
- Real-time trip tracking (WebSocket/Redis pub-sub) with live ETA
- Push notifications (ride request, accept/decline, arrival, completion, cancellation)
- Ride history screens for rider and passenger

### Phase 2: Money and trust

- Payment methods management + secure vault integration
- Receipt retrieval/download in mobile
- Ratings/reviews (mutual)
- Driver earnings dashboard (daily/weekly/monthly)
- Cashout flow (manual request first, instant later)

### Phase 3: Safety and support

- SOS / emergency workflows
- Trusted contact trip sharing
- Help center + issue reporting + ticket status

### Phase 4: Growth and scale

- Referral program
- Promotions/discounts engine
- Localization and multi-currency/payment methods by region

## Concrete technical tasks (next sprint)

1. Mobile app (`mobile/`)
- Add `RoleSwitcher` entry point after login
- Add `RideHistoryScreen` with tabs for rider/passenger history
- Add cancellation actions in rider/passenger trip UI
- Add push notification registration and token sync API call

2. Backend API
- Add `POST /api/passenger/cancel-trip` (or `PATCH /api/passenger/trips/{id}/cancel`)
- Add `PATCH /api/rider/trips/{id}/cancel` with reason codes
- Add `GET /api/passenger/trips/history` and `GET /api/rider/trips/history`
- Add `POST /api/mobile/push-token`

3. Infrastructure
- Introduce realtime channel for trip updates (Redis pub-sub + WebSocket gateway)
- Emit trip lifecycle events from state-machine transitions

4. Data model additions
- `TripCancellation` details (actor, reason, fee)
- `PushDeviceToken`
- `TripRating` / `TripReview`
- `Payout` for driver earnings and cashout requests

## Acceptance criteria for Phase 1

- Passenger can request, cancel, and track trip status live.
- Rider can go online/offline, receive request, accept/decline, and cancel with reason.
- Both parties receive push notifications on key trip events.
- Both parties can view trip history in mobile app.
