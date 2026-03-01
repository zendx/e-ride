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

### PATCH `/api/rider/trips/{tripId}/status`
Auth: `rider`
Request:
```json
{ "status": "accepted" }
```
Allowed statuses: `accepted`, `arrived`, `in_progress`, `completed`, `cancelled`.

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

## Super-admin APIs

### GET `/api/super-admin/tenants`
Auth: `super_admin`
Response: tenants + operational counters.

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
