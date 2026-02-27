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

1. Create a PostgreSQL instance (Neon/Supabase/RDS).
2. Create Redis instance (Upstash/Redis Cloud).
3. Set env vars in Vercel project:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `JWT_ACCESS_TTL`
   - `JWT_REFRESH_TTL`
   - `PLATFORM_BASE_DOMAIN`
4. Run migration and seed from CI/CD or one-off job.

## API contracts

See [docs/api-contracts.md](docs/api-contracts.md).

## Roadmap

See [docs/roadmap.md](docs/roadmap.md).
