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
