# ─── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config-tsconfig/package.json ./packages/config-tsconfig/
COPY packages/types/package.json            ./packages/types/

# Copy api manifest
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY --from=deps /app/node_modules         ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy source
COPY packages/ ./packages/
COPY apps/api/  ./apps/api/
COPY package.json pnpm-workspace.yaml ./

# Generate Prisma client then build
RUN pnpm --filter @bymariap/api prisma:generate
RUN pnpm --filter @bymariap/api build

# ─── Stage 3: runtime ────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config-tsconfig/package.json ./packages/config-tsconfig/
COPY packages/types/package.json            ./packages/types/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --prod

# Copy compiled output and prisma schema
COPY --from=builder /app/apps/api/dist       ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY apps/api/prisma/ ./apps/api/prisma/

WORKDIR /app/apps/api
EXPOSE 3001

CMD ["node", "dist/main.js"]
