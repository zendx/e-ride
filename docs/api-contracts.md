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

### PATCH `/api/rider/status`
Auth: `rider`
Request:
```json
{ "availability": "online", "lat": 6.5, "lng": 3.3 }
```

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
