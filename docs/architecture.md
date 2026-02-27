# CarryGo Architecture

## Layers

- `src/app`: Next.js App Router endpoints/pages.
- `src/lib/modules`: domain use-cases (auth, tenancy, trips, dispatch, payments, kyc, audit, notifications).
- `src/lib/auth`: JWT, RBAC, auth context.
- `src/lib/validation`: zod request validation.
- `src/lib/middleware`: reusable middleware utilities (rate limit).
- `prisma`: schema + seed.
- `tests`: unit and integration test suites.

## Core tenant model

- Parent company (CarryGo) owns the platform and super-admin access.
- Tenant-owned entities are always scoped by `tenantId`.
- Tenant context resolution:
  - subdomain: `{slug}.{PLATFORM_BASE_DOMAIN}`
  - custom domain: `tenant.customDomain`

## Data isolation rules

- All tenant-owned tables include `tenantId` and indexes prefixed by `tenantId`.
- API handlers use tenant from JWT + tenant-specific queries.
- Middleware enforces tenant resolution for `/api/tenant/*` routes.

## Realtime and jobs

- Redis client initialized at `src/lib/redis/client.ts`.
- Current baseline includes caching/rate limiting entry points.
- Extend to queues/pub-sub using BullMQ or Redis streams for dispatch and notification fanout.

## Security baseline

- JWT access + refresh tokens.
- Password hashing with bcrypt.
- Role checks via `requireRole`.
- Zod validation for payloads.
- Rate limits on login and ride creation.
- Structured JSON errors with typed `AppError`.
- Audit logs for critical actions.
