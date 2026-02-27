# CarryGo Roadmap

## MVP (implemented baseline)

- Multi-tenant schema and tenant resolution middleware.
- Auth (JWT), RBAC, rate limiting, zod validation.
- Passenger trip request, dispatch assignment, rider status updates.
- Trip lifecycle transitions and completion payment capture.
- Tenant branding updates.
- KYC review domain service.
- Super-admin and tenant-admin starter dashboards.
- Seeded demo tenants and users.

## V2

- WebSocket/Redis pub-sub live tracking.
- Strong geospatial matching using PostGIS + H3 indexing.
- Wallet ledger with immutable entries and reconciliation.
- Payment provider integrations (Stripe, Paystack, Flutterwave).
- Full complaint/ticket assignment workflows and SLA rules.
- KYC provider integrations and risk scoring.
- Per-tenant feature flags and pricing plans.
- Background jobs (BullMQ) for retries and async workflows.

## V3

- Dispatch optimization (demand heatmaps, batch assignment).
- Fraud detection and anomaly alerts.
- Data warehouse and cross-tenant BI exports.
- Regional compliance packs (GDPR/CCPA/PCI tooling).
