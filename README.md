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
