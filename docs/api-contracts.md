# API Route Structure and Contracts

## Auth

### POST `/api/auth/login`
Request:
```json
{ "email": "admin@alpha-rides.com", "password": "Passw0rd!" }
```
Response:
```json
{
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { "id": "...", "email": "...", "role": "tenant_admin", "tenantId": "...", "tenantSlug": "alpha-rides" }
  }
}
```

### POST `/api/auth/refresh`
Request:
```json
{ "refreshToken": "..." }
```
Response:
```json
{ "data": { "accessToken": "..." } }
```

## Passenger app APIs

### GET `/api/passenger/riders/nearby?lat={lat}&lng={lng}&radiusKm=5&limit=30`
Auth: `passenger`
Response: nearby online approved riders sorted by distance.

### POST `/api/passenger/fare-estimate`
Auth: `passenger`
Request:
```json
{ "estimatedDistanceKm": 12.4, "estimatedDurationMin": 22 }
```
Response: fare breakdown computed from tenant pricing rules.

### POST `/api/passenger/trips`
Auth: `passenger`
Request:
```json
{
  "pickupAddress": "A",
  "dropoffAddress": "B",
  "pickupLat": 6.5,
  "pickupLng": 3.3,
  "dropoffLat": 6.6,
  "dropoffLng": 3.4,
  "estimatedDistanceKm": 12,
  "estimatedDurationMin": 25
}
```
Response: created trip with computed fare and optional initial rider assignment.

### GET `/api/passenger/trips/history?status={status}&limit={limit}`
Auth: `passenger`
Response: passenger trip history (latest first).

### GET `/api/passenger/trips/{tripId}/live`
Auth: `passenger`
Response: live trip snapshot with latest rider location ping and ETA estimates.

### GET `/api/passenger/trips/{tripId}/stream`
Auth: `passenger`
Response: real-time SSE stream (`text/event-stream`) for trip events (`snapshot`, `trip_event`, `heartbeat`).

### PATCH `/api/passenger/trips/{tripId}/cancel`
Auth: `passenger`
Request:
```json
{ "reason": "Driver is too far away" }
```
Effect: cancels an active trip owned by the passenger.

### PATCH `/api/passenger/trips/{tripId}/rate`
Auth: `passenger`
Request:
```json
{ "rating": 5, "feedback": "Smooth ride and professional driving." }
```
Effect: stores passenger review for rider (completed trips only).

### GET `/api/passenger/trips/{tripId}/receipt`
Auth: `passenger`
Response: trip fare + payment receipt payload for completed trip.

### GET `/api/passenger/receipts`
Auth: `passenger`
Response: list of completed-trip receipts for current passenger.

### GET `/api/passenger/receipts/{tripId}/download`
Auth: `passenger`
Response: downloadable text receipt file.

## Rider app APIs

### POST `/api/rider/register`
Auth: public
Request:
```json
{
  "tenantSlug": "alpha-rides",
  "fullName": "John Rider",
  "email": "john@alpha-rides.com",
  "password": "StrongPass123",
  "phoneNumber": "+1000000",
  "licenseNumber": "RID-33211",
  "vehicleType": "Sedan",
  "vehiclePlate": "ABC-1234"
}
```
Effect: creates rider account in `pending` status for tenant approval.

### PATCH `/api/rider/status`
Auth: `rider`
Request:
```json
{ "availability": "online", "lat": 6.5, "lng": 3.3 }
```
Requires rider user status `active` (approved).

### PATCH `/api/rider/location`
Auth: `rider`
Request:
```json
{ "lat": 6.5, "lng": 3.3, "tripId": "cuid_optional" }
```
Effect: saves rider location ping and updates rider profile coordinates.

### PATCH `/api/rider/trips/{tripId}/status`
Auth: `rider`
Request:
```json
{ "status": "accepted" }
```
Allowed statuses: `accepted`, `arrived`, `in_progress`, `completed`, `cancelled`.

For `cancelled`, include:
```json
{ "status": "cancelled", "cancelReason": "Rider emergency" }
```

### PATCH `/api/rider/trips/{tripId}/cancel`
Auth: `rider`
Request:
```json
{ "reason": "Vehicle breakdown" }
```
Effect: cancels an active trip assigned to the rider.

### GET `/api/rider/trips/history?status={status}&limit={limit}`
Auth: `rider`
Response: rider trip history (latest first).

### GET `/api/rider/trips/{tripId}/live`
Auth: `rider`
Response: live trip snapshot with latest rider location ping and ETA estimates.

### GET `/api/rider/trips/{tripId}/stream`
Auth: `rider`
Response: real-time SSE stream (`text/event-stream`) for trip events (`snapshot`, `trip_event`, `heartbeat`).

### PATCH `/api/rider/trips/{tripId}/rate`
Auth: `rider`
Request:
```json
{ "rating": 4, "feedback": "Passenger was punctual." }
```
Effect: stores rider review for passenger (completed trips only).

### GET `/api/rider/trips/{tripId}/receipt`
Auth: `rider`
Response: rider earnings receipt payload for completed trip.

### GET `/api/rider/receipts`
Auth: `rider`
Response: list of completed-trip earnings receipts for current rider.

### GET `/api/rider/receipts/{tripId}/download`
Auth: `rider`
Response: downloadable text earnings receipt file.

## Shared mobile APIs

### POST `/api/mobile/push-token`
Auth: `rider` or `passenger`
Request:
```json
{
  "token": "ExponentPushToken[...]",
  "platform": "android",
  "appVersion": "0.1.0"
}
```
Effect: registers (logs) current mobile push token for notifications.

### GET `/api/mobile/preferences`
Auth: `rider` or `passenger`
Response: latest persisted mobile profile/payment/notification preferences.

### PATCH `/api/mobile/preferences`
Auth: `rider` or `passenger`
Request:
```json
{
  "profileName": "Jane Doe",
  "profilePhone": "+1000000",
  "preferredPaymentMethod": "card",
  "notifications": {
    "rideRequests": true,
    "rideUpdates": true,
    "promotions": false
  }
}
```

### POST `/api/mobile/support/tickets`
Auth: `rider` or `passenger`
Request:
```json
{
  "subject": "Lost item",
  "body": "I left a bag in the car after trip abc123.",
  "priority": "high"
}
```
Effect: creates a support ticket for tenant operations.

### GET `/api/mobile/support/tickets`
Auth: `rider` or `passenger`
Response: current user's support tickets with recent communications.

### GET `/api/mobile/support/tickets/{ticketId}/messages`
Auth: `rider` or `passenger`
Response: chat-style support messages for ticket owned by user.

### POST `/api/mobile/support/tickets/{ticketId}/messages`
Auth: `rider` or `passenger`
Request:
```json
{ "body": "Any update on my ticket?" }
```
Effect: posts inbound support chat message for ticket.

### POST `/api/mobile/support/tickets/{ticketId}/simulate-reply`
Auth: `rider` or `passenger`
Effect: creates simulated outbound support response for local testing/demo flows.

### GET `/api/mobile/trips/{tripId}/chat`
Auth: `rider` or `passenger`
Response: direct in-app trip chat messages for trip participant.

### POST `/api/mobile/trips/{tripId}/chat`
Auth: `rider` or `passenger`
Request:
```json
{ "body": "I am at the pickup gate." }
```
Effect: sends direct in-app trip chat message and emits trip event.

## Tenant admin/dispatcher APIs

### POST `/api/tenant/trips/assign`
Auth: `tenant_admin` or `dispatcher`
Request:
```json
{ "tripId": "cuid", "riderId": "cuid" }
```

### PATCH `/api/tenant/branding`
Auth: `tenant_admin`
Request:
```json
{
  "appName": "AlphaGo",
  "logoUrl": "https://...",
  "primaryColor": "#0EA5E9",
  "secondaryColor": "#0F172A",
  "supportEmail": "support@alpha-rides.com",
  "supportPhone": "+1000000"
}
```

### POST `/api/tenant/trips/{tripId}/complete`
Auth: `tenant_admin` or `dispatcher`
Effect: marks trip completed and captures payment.

### PATCH `/api/tenant/riders/{riderId}/approve`
Auth: `tenant_admin`
Effect: approves pending rider account (sets rider user status to `active`).

### GET `/api/tenant/monitoring`
Auth: `tenant_admin` or `dispatcher`
Query params:
- `status` (optional): trip status filter for history
- `activeLimit`, `peopleLimit`, `historyLimit`, `eventsLimit` (optional)
Response:
- `summary`: active trips, rider/passenger totals, completed/cancelled today, payments, open complaints/tickets
- `activeTrips`: near real-time active trip feed
- `riders`, `passengers`: registry data
- `tripHistory`, `payments`: ride/payment records
- `complaints`, `supportTickets`, `supportCommunications`
- `riderLocationPings`, `riderComplianceDocs`
- `notifications`, `systemErrors`, `securityLogs`, `geofenceAlerts`, `analyticsSnapshots`

### GET `/api/tenant/monitoring/stream?accessToken={token}`
Auth: `tenant_admin` or `dispatcher`
Response: tenant monitoring SSE stream (`ready`, `tenant_event`, `heartbeat`).

## Super-admin APIs

### GET `/api/super-admin/tenants`
Auth: `super_admin`
Response: tenants + operational counters.

### GET `/api/super-admin/dashboard/stream?accessToken={token}`
Auth: `super_admin`
Response: super-admin SSE stream (`ready`, `superadmin_event`, `heartbeat`).

### GET `/api/super-admin/tenants/{tenantId}/stream?accessToken={token}`
Auth: `super_admin`
Response: tenant-scoped super-admin SSE stream (`ready`, `tenant_event`, `heartbeat`).

### POST `/api/super-admin/tenants`
Auth: `super_admin`
Request:
```json
{
  "name": "Gamma Rides",
  "slug": "gamma-rides",
  "appName": "GammaGo",
  "supportEmail": "support@gamma-rides.com",
  "supportPhone": "+1000000",
  "primaryColor": "#0EA5E9",
  "secondaryColor": "#0F172A",
  "platformCommissionBps": 1500,
  "adminFullName": "Gamma Admin",
  "adminEmail": "admin@gamma-rides.com",
  "adminPassword": "StrongPass123"
}
```
Effect: creates tenant, initial tenant admin user, default pricing rule, and audit log.
