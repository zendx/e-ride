# CarryGo

Production-ready white-label multi-tenant ride-hailing SaaS baseline using Next.js App Router, Node.js, PostgreSQL/Prisma, and Redis.

## Architecture at a glance

- Multi-tenant isolation on tenant-owned records via `tenantId`.
- Tenant resolution middleware from subdomain (`{tenant}.carrygo.local`) and custom domains.
- App surfaces:
  - Super Admin dashboard (`/super-admin`)
  - Tenant Admin dashboard (`/tenant-admin`)
  - Rider/Passenger/Tenant/Super-admin APIs under `src/app/(public)/api/*`
- Modular domain services in `src/lib/modules/*`.
- RBAC roles: `super_admin`, `tenant_admin`, `dispatcher`, `rider`, `passenger`, `support`.

## Folder structure

See [docs/architecture.md](docs/architecture.md).

## Quick start

1. Install dependencies

```bash
npm install
```

2. Configure environment

```bash
cp .env.example .env
```

3. Generate Prisma client and run migrations

```bash
npm run db:generate
npm run db:migrate -- --name init
```

4. Seed demo data

```bash
npm run db:seed
```

5. Start app

```bash
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, `Add New Project` -> import this repo.
3. Build settings:
   - Install Command: `npm install`
   - Build Command: `npm run vercel-build`
   - Output Directory: `.next` (default)
4. Provision services:
   - PostgreSQL (Neon/Supabase/RDS)
   - Redis (Upstash/Redis Cloud)
5. Set required environment variables in Vercel project:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `JWT_ACCESS_TTL`
   - `JWT_REFRESH_TTL`
   - `PLATFORM_BASE_DOMAIN`
6. Set optional environment variables if used:
   - `DIRECT_URL` (recommended for Prisma migrate jobs)
   - `NOTIFICATION_PROVIDER`
   - `NOTIFICATION_FROM_EMAIL`
   - `RESEND_API_KEY`
7. Run Prisma migrations against production database (recommended from CI or local one-off):

```bash
npx prisma migrate deploy
```

8. (Optional) seed initial data:

```bash
npm run db:seed
```

## API contracts

See [docs/api-contracts.md](docs/api-contracts.md).

## Mobile app (Rider + Passenger)

A new Expo-based mobile app scaffold is available in `mobile/` with:
- login via `/api/auth/login`
- rider flow: update availability and trip status
- passenger flow: request trip
- rider/passenger trip cancellation
- rider/passenger trip history
- rider location pings + live trip snapshots
- rider/passenger trip ratings and feedback
- trip event streaming endpoints (SSE) + in-app auto-refresh live tracking loop
- tenant-admin and super-admin dashboards now consume SSE streams with polling fallback
- super-admin tenant detail page now consumes tenant-scoped SSE stream with polling fallback
- mobile preferences sync API, in-app help center ticketing, and passenger receipt endpoint
- rider earnings receipt endpoint + support ticket inbox/messages API
- trip chat scaffold API + passenger/rider receipt list endpoints + help-center auto-refresh
- receipt download endpoints + simulated support replies + live chat auto-refresh toggles

### Run mobile app

1. Install mobile dependencies

```bash
npm run mobile:install
```

2. Set API base URL for Expo

```bash
# PowerShell
$env:EXPO_PUBLIC_API_BASE_URL="http://YOUR_LOCAL_IP:3000"
```

Set Google Maps key for map + address search:

```bash
# PowerShell
$env:EXPO_PUBLIC_GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_KEY"
```

3. Start Expo

```bash
npm run mobile:start
```

You can also run:
- `npm run mobile:android`
- `npm run mobile:ios`

## Roadmap

See [docs/roadmap.md](docs/roadmap.md).
