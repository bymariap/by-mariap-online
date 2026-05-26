# bymariap (rearquitectura NestJS)

Greenfield monorepo. Phase 1 ships the API foundation: auth, RBAC, users.

## Setup

```bash
pnpm install
docker compose up -d postgres
cp apps/api/.env.example apps/api/.env
pnpm --filter @bymariap/api prisma migrate dev
pnpm --filter @bymariap/api prisma:seed
pnpm --filter @bymariap/api dev
```

## Tests

```bash
pnpm --filter @bymariap/api test       # unit
pnpm --filter @bymariap/api test:e2e   # requires Docker
```

## Layout

- `apps/api` — NestJS backend (this phase)
- `apps/admin` — Vite + React panel (Phase 2)
- `apps/storefront` — Next.js 15 (Phase 3)
- `packages/types` — shared DTO contracts
- `packages/config-tsconfig` — shared tsconfig

## Phase 2 — Admin + Products

Two apps, two ports:
- API: http://localhost:3001 (`pnpm --filter @bymariap/api dev`)
- Admin: http://localhost:5173 (`pnpm --filter @bymariap/admin dev`)

Set `ADMIN_ORIGIN=http://localhost:5173` in `apps/api/.env` and `VITE_API_BASE_URL=http://localhost:3001` in `apps/admin/.env`.

Seed with demo data:
```bash
SEED_DEMO_DATA=true pnpm --filter @bymariap/api prisma:seed
```

## Phase 4 — Storefront

Three apps:
- API: http://localhost:3001
- Admin: http://localhost:5173
- Storefront: http://localhost:3000

Set `ADMIN_ORIGIN=http://localhost:5173,http://localhost:3000` in `apps/api/.env`.

Run:
```bash
pnpm --filter @bymariap/storefront dev
```

Required env (`apps/storefront/.env.local`):
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`
- `API_INTERNAL_BASE_URL=http://localhost:3001`
- `NEXT_PUBLIC_WOMPI_REDIRECT_BASE=https://checkout.wompi.co/p`
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

Design source: Stitch project **Cejas Medellín Studio** (id 5755618256776589056).
