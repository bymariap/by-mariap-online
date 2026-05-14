# Phase 1: Foundation + Auth + RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the new NestJS monorepo with Prisma schema, working JWT auth (login/refresh/logout), and a permission-based RBAC layer ready for the rest of the modules to plug into.

**Architecture:** Turborepo + pnpm workspaces. `apps/api` is a NestJS app. Prisma owns the full schema from day 1 (frozen design from the spec). Auth uses JWT in httpOnly cookies; refresh tokens persisted hashed for revocation. RBAC encodes `recurso:accion[:scope]` strings in the JWT; guards check membership; service-level scope filtering is applied manually in each later module (this plan only ships the guards + decorators).

**Tech Stack:** Node 20, pnpm, Turborepo, NestJS 10, Prisma 5, PostgreSQL 16, bcrypt, jsonwebtoken (`@nestjs/jwt`), class-validator, Jest, `jest-mock-extended`, supertest, testcontainers (Postgres).

**Scope of this plan (does NOT include):** products, cart, orders, payments, services, availability, appointments, client-record, notifications, analytics, admin/storefront frontends. Those are subsequent phase plans.

---

## File Structure

```
nuevo-repo/
├── package.json                          # root, workspaces + scripts
├── pnpm-workspace.yaml
├── turbo.json
├── .gitignore
├── .editorconfig
├── .env.example                          # documented env vars
├── README.md
├── apps/
│   └── api/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.build.json
│       ├── nest-cli.json
│       ├── jest.config.ts
│       ├── .env.example
│       ├── prisma/
│       │   ├── schema.prisma             # FULL schema from spec
│       │   └── seed.ts                   # roles, permissions, admin user
│       ├── test/
│       │   ├── jest-e2e.config.ts
│       │   ├── helpers/db.ts             # testcontainers bootstrap
│       │   └── auth.e2e-spec.ts          # smoke E2E
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           ├── prisma/
│           │   ├── prisma.module.ts
│           │   └── prisma.service.ts
│           ├── common/
│           │   ├── crypto/
│           │   │   ├── password.ts
│           │   │   └── password.spec.ts
│           │   ├── decorators/
│           │   │   ├── public.decorator.ts
│           │   │   ├── current-user.decorator.ts
│           │   │   └── require-permissions.decorator.ts
│           │   ├── guards/
│           │   │   ├── jwt-auth.guard.ts
│           │   │   ├── jwt-auth.guard.spec.ts
│           │   │   ├── permissions.guard.ts
│           │   │   └── permissions.guard.spec.ts
│           │   ├── filters/
│           │   │   └── http-exception.filter.ts
│           │   └── types/
│           │       └── auth-user.ts
│           └── modules/
│               ├── auth/
│               │   ├── auth.module.ts
│               │   ├── auth.controller.ts
│               │   ├── auth.controller.spec.ts
│               │   ├── auth.service.ts
│               │   ├── auth.service.spec.ts
│               │   ├── jwt.strategy.ts
│               │   └── dto/
│               │       ├── login.dto.ts
│               │       └── refresh.dto.ts
│               ├── users/
│               │   ├── users.module.ts
│               │   ├── users.controller.ts
│               │   ├── users.controller.spec.ts
│               │   ├── users.service.ts
│               │   ├── users.service.spec.ts
│               │   └── dto/
│               │       ├── create-user.dto.ts
│               │       ├── update-user.dto.ts
│               │       └── update-me.dto.ts
│               └── rbac/
│                   ├── rbac.module.ts
│                   ├── rbac.controller.ts
│                   ├── rbac.controller.spec.ts
│                   ├── rbac.service.ts
│                   ├── rbac.service.spec.ts
│                   └── dto/
│                       ├── create-role.dto.ts
│                       └── assign-permissions.dto.ts
└── packages/
    ├── config-tsconfig/
    │   ├── package.json
    │   └── base.json
    └── types/
        ├── package.json
        ├── tsconfig.json
        └── src/
            └── index.ts                  # shared DTO contracts (starts empty)
```

**Note on `packages/ui`, `apps/admin`, `apps/storefront`:** scaffolded in later phase plans, not here.

---

## Task 1: Initialize monorepo skeleton

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.editorconfig`, `.env.example`, `README.md`

- [ ] **Step 1: Initialize repo + pnpm workspace**

Run:
```bash
git init
pnpm init
```

- [ ] **Step 2: Write root `package.json`**

```json
{
  "name": "bymariap",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 3: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: Write `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev":   { "cache": false, "persistent": true },
    "test":  { "dependsOn": ["^build"], "outputs": [] },
    "lint":  { "outputs": [] },
    "typecheck": { "outputs": [] }
  }
}
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules
dist
.env
.env.local
*.log
.turbo
coverage
```

- [ ] **Step 6: Install root deps + initial commit**

Run:
```bash
pnpm install
git add -A
git commit -m "chore: init monorepo with turborepo + pnpm workspaces"
```

Expected: clean commit, `pnpm-lock.yaml` present.

---

## Task 2: Shared tsconfig package

**Files:**
- Create: `packages/config-tsconfig/package.json`
- Create: `packages/config-tsconfig/base.json`

- [ ] **Step 1: Create `packages/config-tsconfig/package.json`**

```json
{
  "name": "@bymariap/config-tsconfig",
  "version": "0.0.0",
  "private": true,
  "files": ["base.json"]
}
```

- [ ] **Step 2: Create `packages/config-tsconfig/base.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/config-tsconfig
git commit -m "chore: add shared tsconfig package"
```

---

## Task 3: Shared types package (placeholder)

**Files:**
- Create: `packages/types/package.json`, `packages/types/tsconfig.json`, `packages/types/src/index.ts`

- [ ] **Step 1: Create `packages/types/package.json`**

```json
{
  "name": "@bymariap/types",
  "version": "0.0.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "devDependencies": {
    "@bymariap/config-tsconfig": "workspace:*",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `packages/types/tsconfig.json`**

```json
{
  "extends": "@bymariap/config-tsconfig/base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/types/src/index.ts`**

```ts
export type UserRole = 'admin' | 'finance' | 'specialist' | 'customer';
```

- [ ] **Step 4: Install + commit**

```bash
pnpm install
git add packages/types pnpm-lock.yaml
git commit -m "chore: add shared types package with UserRole"
```

---

## Task 4: Bootstrap NestJS in `apps/api`

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/tsconfig.build.json`, `apps/api/nest-cli.json`, `apps/api/.env.example`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts`

- [ ] **Step 1: Create `apps/api/package.json`**

```json
{
  "name": "@bymariap/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main.js",
    "test": "jest",
    "test:e2e": "jest --config test/jest-e2e.config.ts",
    "typecheck": "tsc --noEmit",
    "lint": "eslint \"src/**/*.ts\"",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/config": "^3.2.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/platform-express": "^10.3.0",
    "@prisma/client": "^5.13.0",
    "bcrypt": "^5.1.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "cookie-parser": "^1.4.6",
    "reflect-metadata": "^0.2.1",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@bymariap/config-tsconfig": "workspace:*",
    "@bymariap/types": "workspace:*",
    "@nestjs/cli": "^10.3.0",
    "@nestjs/testing": "^10.3.0",
    "@types/bcrypt": "^5.0.2",
    "@types/cookie-parser": "^1.4.7",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.12.0",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "jest-mock-extended": "^3.0.5",
    "prisma": "^5.13.0",
    "supertest": "^6.3.4",
    "testcontainers": "^10.9.0",
    "ts-jest": "^29.1.2",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.0"
  },
  "prisma": { "seed": "ts-node prisma/seed.ts" }
}
```

- [ ] **Step 2: Create `apps/api/tsconfig.json`**

```json
{
  "extends": "@bymariap/config-tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["node", "jest"]
  },
  "include": ["src", "prisma", "test"]
}
```

- [ ] **Step 3: Create `apps/api/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*.spec.ts", "**/*.e2e-spec.ts"]
}
```

- [ ] **Step 4: Create `apps/api/nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

- [ ] **Step 5: Create `apps/api/.env.example`**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bymariap?schema=public
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
JWT_ACCESS_TTL=3600
JWT_REFRESH_TTL=604800
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
SEED_ADMIN_EMAIL=admin@bymariap.com
SEED_ADMIN_PASSWORD=change-me-admin
PORT=3001
NODE_ENV=development
```

- [ ] **Step 6: Create `apps/api/src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
})
export class AppModule {}
```

- [ ] **Step 7: Create `apps/api/src/main.ts`**

```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(Number(process.env.PORT ?? 3001));
}
bootstrap();
```

- [ ] **Step 8: Create `apps/api/jest.config.ts`**

```ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts'],
};
export default config;
```

- [ ] **Step 9: Install + verify build**

Run:
```bash
pnpm install
pnpm --filter @bymariap/api build
```

Expected: clean build, `apps/api/dist/main.js` exists.

- [ ] **Step 10: Commit**

```bash
git add apps/api pnpm-lock.yaml
git commit -m "feat(api): bootstrap nestjs application"
```

---

## Task 5: Prisma schema (full design from spec)

**Files:**
- Create: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Write `apps/api/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ---------- Auth / RBAC ----------

model Role {
  id          String           @id @default(cuid())
  name        String           @unique
  description String?
  users       User[]
  permissions RolePermission[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}

model Permission {
  id          String           @id @default(cuid())
  key         String           @unique // e.g. "appointments:read:own"
  description String?
  roles       RolePermission[]
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@id([roleId, permissionId])
}

model User {
  id            String         @id @default(cuid())
  email         String         @unique
  passwordHash  String
  fullName      String
  phone         String?
  roleId        String
  role          Role           @relation(fields: [roleId], references: [id])
  specialist    Specialist?
  refreshTokens RefreshToken[]
  consents      Consent[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Specialist {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  bio         String?
  specialties String[] @default([])
  avatarUrl   String?
}

model RefreshToken {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String    @unique
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())
  @@index([userId])
}

// ---------- Habeas Data ----------

model Consent {
  id                 String   @id @default(cuid())
  customerId         String
  customer           User     @relation(fields: [customerId], references: [id], onDelete: Cascade)
  version            String
  acceptedAt         DateTime @default(now())
  ip                 String
  policyTextSnapshot String
  @@index([customerId])
}

model DataAccessLog {
  id                String   @id @default(cuid())
  accessorUserId    String
  accessedRecordId  String
  accessedAt        DateTime @default(now())
  action            String   // read | update | delete | export
  @@index([accessedRecordId])
}

// ---------- Future modules: scaffolded later phases ----------
// products, categories, carts, orders, payments, shipping_zones,
// services, specialist_availability, appointments, client_records,
// webhook_log — added in their respective phase plans.
```

- [ ] **Step 2: Generate Prisma client + create initial migration against a local Postgres**

Run:
```bash
# Ensure docker postgres is up:
docker run -d --name bymariap-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
cp apps/api/.env.example apps/api/.env
pnpm --filter @bymariap/api prisma:generate
pnpm --filter @bymariap/api prisma migrate dev --name init
```

Expected: migration `prisma/migrations/<ts>_init/migration.sql` created; `User`, `Role`, `Permission`, `RolePermission`, `RefreshToken`, `Specialist`, `Consent`, `DataAccessLog` tables exist.

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma
git commit -m "feat(api): prisma schema for auth, rbac, specialists, habeas data"
```

---

## Task 6: PrismaService + module

**Files:**
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`

- [ ] **Step 1: Write `prisma.service.ts`**

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

- [ ] **Step 2: Write `prisma.module.ts`**

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

- [ ] **Step 3: Register in `app.module.ts`**

Edit `apps/api/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
})
export class AppModule {}
```

- [ ] **Step 4: Build to verify**

Run: `pnpm --filter @bymariap/api build`. Expected: success.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): prisma service + global module"
```

---

## Task 7: Password hashing helper (TDD)

**Files:**
- Create: `apps/api/src/common/crypto/password.ts`
- Create: `apps/api/src/common/crypto/password.spec.ts`

- [ ] **Step 1: Write the failing test `password.spec.ts`**

```ts
import { hashPassword, verifyPassword } from './password';

describe('password helper', () => {
  it('hashes a password and verifies it', async () => {
    const hash = await hashPassword('s3cret!');
    expect(hash).not.toBe('s3cret!');
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    await expect(verifyPassword('s3cret!', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('s3cret!');
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @bymariap/api test -- password.spec`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `password.ts`**

```ts
import bcrypt from 'bcrypt';

const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `pnpm --filter @bymariap/api test -- password.spec`. Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/crypto
git commit -m "feat(api): bcrypt password helper with cost 12"
```

---

## Task 8: AuthUser type + CurrentUser decorator

**Files:**
- Create: `apps/api/src/common/types/auth-user.ts`
- Create: `apps/api/src/common/decorators/current-user.decorator.ts`
- Create: `apps/api/src/common/decorators/public.decorator.ts`
- Create: `apps/api/src/common/decorators/require-permissions.decorator.ts`

- [ ] **Step 1: Write `auth-user.ts`**

```ts
import type { UserRole } from '@bymariap/types';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
  specialistId?: string;
}
```

- [ ] **Step 2: Write `current-user.decorator.ts`**

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../types/auth-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest().user,
);
```

- [ ] **Step 3: Write `public.decorator.ts`**

```ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 4: Write `require-permissions.decorator.ts`**

```ts
import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';
export const RequirePermissions = (...perms: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, perms);
```

- [ ] **Step 5: Build to verify, commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src/common
git commit -m "feat(api): AuthUser type + Public/CurrentUser/RequirePermissions decorators"
```

---

## Task 9: JwtAuthGuard (TDD)

**Files:**
- Create: `apps/api/src/common/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/common/guards/jwt-auth.guard.spec.ts`

- [ ] **Step 1: Write failing test `jwt-auth.guard.spec.ts`**

```ts
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { JwtAuthGuard } from './jwt-auth.guard';

function ctx(cookies: Record<string, string>, handler = () => {}): ExecutionContext {
  const req: any = { cookies };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => handler,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const reflector = mock<Reflector>();
  const jwt = mock<JwtService>();
  const guard = new JwtAuthGuard(jwt, reflector);

  beforeEach(() => jest.resetAllMocks());

  it('allows @Public() routes', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);
    await expect(guard.canActivate(ctx({}))).resolves.toBe(true);
  });

  it('rejects when access_token cookie missing', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    await expect(guard.canActivate(ctx({}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches user to request when token valid', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    jwt.verifyAsync.mockResolvedValueOnce({
      sub: 'u1', email: 'a@b.c', role: 'admin', permissions: ['*'],
    });
    const c = ctx({ access_token: 'tok' });
    await expect(guard.canActivate(c)).resolves.toBe(true);
    const req = c.switchToHttp().getRequest();
    expect(req.user).toEqual({
      id: 'u1', email: 'a@b.c', role: 'admin', permissions: ['*'], specialistId: undefined,
    });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- jwt-auth.guard.spec`. Expected: module not found.

- [ ] **Step 3: Implement `jwt-auth.guard.ts`**

```ts
import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const token = req.cookies?.access_token;
    if (!token) throw new UnauthorizedException();

    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions ?? [],
        specialistId: payload.specialistId,
      };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- jwt-auth.guard.spec`. Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/guards/jwt-auth.guard.ts apps/api/src/common/guards/jwt-auth.guard.spec.ts
git commit -m "feat(api): JwtAuthGuard with @Public bypass"
```

---

## Task 10: PermissionsGuard (TDD)

**Files:**
- Create: `apps/api/src/common/guards/permissions.guard.ts`
- Create: `apps/api/src/common/guards/permissions.guard.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { PermissionsGuard } from './permissions.guard';

function ctx(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => () => {},
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  const reflector = mock<Reflector>();
  const guard = new PermissionsGuard(reflector);
  beforeEach(() => jest.resetAllMocks());

  it('passes when no permissions required', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(undefined);
    expect(guard.canActivate(ctx({ permissions: [] }))).toBe(true);
  });

  it('passes with wildcard *', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(['products:write']);
    expect(guard.canActivate(ctx({ permissions: ['*'] }))).toBe(true);
  });

  it('passes with exact match', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(['products:write']);
    expect(guard.canActivate(ctx({ permissions: ['products:write'] }))).toBe(true);
  });

  it('passes when user has wider scope than required', () => {
    // required "appointments:read" — user has "appointments:read" (broader than ":own")
    reflector.getAllAndOverride.mockReturnValueOnce(['appointments:read:own']);
    expect(guard.canActivate(ctx({ permissions: ['appointments:read'] }))).toBe(true);
  });

  it('rejects when missing', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(['products:write']);
    expect(() => guard.canActivate(ctx({ permissions: ['products:read'] })))
      .toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- permissions.guard.spec`.

- [ ] **Step 3: Implement `permissions.guard.ts`**

```ts
import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      REQUIRED_PERMISSIONS_KEY, [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user = ctx.switchToHttp().getRequest().user;
    const owned: string[] = user?.permissions ?? [];
    if (owned.includes('*')) return true;

    const ok = required.every((req) => owned.some((p) => satisfies(p, req)));
    if (!ok) throw new ForbiddenException();
    return true;
  }
}

// "appointments:read" satisfies "appointments:read:own" (broader covers narrower).
// Exact match also satisfies.
function satisfies(owned: string, required: string): boolean {
  if (owned === required) return true;
  const [oRes, oAct, oScope] = owned.split(':');
  const [rRes, rAct, rScope] = required.split(':');
  if (oRes !== rRes || oAct !== rAct) return false;
  // owned has no scope -> covers any required scope
  if (!oScope && rScope) return true;
  return false;
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- permissions.guard.spec`. Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/guards/permissions.guard.ts apps/api/src/common/guards/permissions.guard.spec.ts
git commit -m "feat(api): PermissionsGuard with wildcard + scope coverage"
```

---

## Task 11: HTTP exception filter

**Files:**
- Create: `apps/api/src/common/filters/http-exception.filter.ts`

- [ ] **Step 1: Implement filter**

```ts
import {
  ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException
      ? exception.getResponse()
      : { message: 'Internal server error' };

    if (status >= 500) this.logger.error(exception);
    res.status(status).json(typeof body === 'string' ? { message: body } : body);
  }
}
```

- [ ] **Step 2: Register filter globally in `main.ts`**

Edit `apps/api/src/main.ts` — add inside `bootstrap()` after `useGlobalPipes`:

```ts
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
// ...
app.useGlobalFilters(new AllExceptionsFilter());
```

- [ ] **Step 3: Build, commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src
git commit -m "feat(api): global exception filter"
```

---

## Task 12: AuthService — login (TDD)

**Files:**
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.service.spec.ts`
- Create: `apps/api/src/modules/auth/dto/login.dto.ts`
- Create: `apps/api/src/modules/auth/dto/refresh.dto.ts`

- [ ] **Step 1: Write `login.dto.ts`**

```ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(6) password!: string;
}
```

- [ ] **Step 2: Write `refresh.dto.ts`** (empty placeholder; refresh comes via cookie, not body)

```ts
export class RefreshDto {}
```

- [ ] **Step 3: Write failing test `auth.service.spec.ts` (login cases only)**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import * as pw from '../../common/crypto/password';

const prisma = mock<PrismaService>();
const jwt = mock<JwtService>();
const svc = new AuthService(prisma, jwt);

const userRow = {
  id: 'u1',
  email: 'a@b.c',
  passwordHash: 'hash',
  fullName: 'A',
  phone: null,
  roleId: 'r1',
  role: {
    id: 'r1', name: 'admin', description: null, createdAt: new Date(), updatedAt: new Date(),
    permissions: [{ permission: { key: '*' } }],
  },
  specialist: null,
};

describe('AuthService.login', () => {
  beforeEach(() => { mockReset(prisma); mockReset(jwt); });

  it('returns tokens for valid credentials', async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce(userRow);
    jest.spyOn(pw, 'verifyPassword').mockResolvedValueOnce(true);
    jwt.signAsync.mockResolvedValueOnce('access').mockResolvedValueOnce('refresh');
    (prisma.refreshToken as any).create.mockResolvedValueOnce({});

    const out = await svc.login('a@b.c', 'pw');
    expect(out.accessToken).toBe('access');
    expect(out.refreshToken).toBe('refresh');
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  it('rejects unknown email', async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.login('a@b.c', 'pw')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects wrong password', async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce(userRow);
    jest.spyOn(pw, 'verifyPassword').mockResolvedValueOnce(false);
    await expect(svc.login('a@b.c', 'pw')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
```

- [ ] **Step 4: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- auth.service.spec`.

- [ ] **Step 5: Implement `auth.service.ts` (login only for now)**

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { verifyPassword } from '../../common/crypto/password';

const ACCESS_TTL = () => Number(process.env.JWT_ACCESS_TTL ?? 3600);
const REFRESH_TTL = () => Number(process.env.JWT_REFRESH_TTL ?? 604800);

export interface TokenPair { accessToken: string; refreshToken: string; }

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
        specialist: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    if (!(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException();
    }
    return this.issueTokens(user);
  }

  private async issueTokens(user: any): Promise<TokenPair> {
    const permissions = user.role.permissions.map((rp: any) => rp.permission.key);
    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions,
      specialistId: user.specialist?.id,
    };
    const refreshJti = randomUUID();
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: ACCESS_TTL(),
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti: refreshJti },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: REFRESH_TTL() },
    );
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL() * 1000),
      },
    });
    return { accessToken, refreshToken };
  }
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
```

- [ ] **Step 6: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- auth.service.spec`. Expected: 3 passing.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/auth
git commit -m "feat(api): AuthService.login issues access + refresh tokens"
```

---

## Task 13: AuthService — refresh + logout (TDD)

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Modify: `apps/api/src/modules/auth/auth.service.spec.ts`

- [ ] **Step 1: Add tests for refresh + logout**

Append to `auth.service.spec.ts`:

```ts
import { sha256 } from './auth.service';

describe('AuthService.refresh', () => {
  beforeEach(() => { mockReset(prisma); mockReset(jwt); });

  it('rotates a valid refresh token', async () => {
    jwt.verifyAsync.mockResolvedValueOnce({ sub: 'u1', jti: 'x' });
    (prisma.refreshToken as any).findUnique.mockResolvedValueOnce({
      id: 'rt1', userId: 'u1', tokenHash: sha256('old'), expiresAt: new Date(Date.now() + 1e6),
      revokedAt: null,
    });
    (prisma.refreshToken as any).update.mockResolvedValueOnce({});
    (prisma.user as any).findUnique.mockResolvedValueOnce(userRow);
    jwt.signAsync.mockResolvedValueOnce('access2').mockResolvedValueOnce('refresh2');
    (prisma.refreshToken as any).create.mockResolvedValueOnce({});

    const out = await svc.refresh('old');
    expect(out.accessToken).toBe('access2');
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ revokedAt: expect.any(Date) }) }),
    );
  });

  it('rejects a revoked token', async () => {
    jwt.verifyAsync.mockResolvedValueOnce({ sub: 'u1', jti: 'x' });
    (prisma.refreshToken as any).findUnique.mockResolvedValueOnce({
      id: 'rt1', userId: 'u1', tokenHash: sha256('old'),
      expiresAt: new Date(Date.now() + 1e6), revokedAt: new Date(),
    });
    await expect(svc.refresh('old')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unknown token hash', async () => {
    jwt.verifyAsync.mockResolvedValueOnce({ sub: 'u1', jti: 'x' });
    (prisma.refreshToken as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.refresh('old')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('AuthService.logout', () => {
  beforeEach(() => { mockReset(prisma); mockReset(jwt); });

  it('revokes the token if present', async () => {
    (prisma.refreshToken as any).updateMany.mockResolvedValueOnce({ count: 1 });
    await svc.logout('refresh-tok');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: sha256('refresh-tok'), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('is a no-op if no token provided', async () => {
    await svc.logout(undefined);
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- auth.service.spec`.

- [ ] **Step 3: Add refresh + logout to `auth.service.ts`**

Append methods inside the `AuthService` class:

```ts
async refresh(refreshToken: string): Promise<TokenPair> {
  let payload: any;
  try {
    payload = await this.jwt.verifyAsync(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });
  } catch { throw new UnauthorizedException(); }

  const row = await this.prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(refreshToken) },
  });
  if (!row || row.revokedAt || row.expiresAt < new Date()) {
    throw new UnauthorizedException();
  }

  await this.prisma.refreshToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date() },
  });

  const user = await this.prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
      specialist: true,
    },
  });
  if (!user) throw new UnauthorizedException();
  return this.issueTokens(user);
}

async logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  await this.prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- auth.service.spec`. Expected: 8 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth
git commit -m "feat(api): AuthService refresh rotation + logout revocation"
```

---

## Task 14: AuthController + cookies

**Files:**
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/auth.controller.spec.ts`
- Create: `apps/api/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Write controller test**

```ts
import { AuthController } from './auth.controller';
import { mock } from 'jest-mock-extended';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const svc = mock<AuthService>();
  const ctrl = new AuthController(svc);

  it('sets cookies on login', async () => {
    svc.login.mockResolvedValueOnce({ accessToken: 'a', refreshToken: 'r' });
    const res: any = { cookie: jest.fn(), json: jest.fn() };
    await ctrl.login({ email: 'a@b.c', password: 'pw123456' }, res);
    expect(res.cookie).toHaveBeenCalledWith('access_token', 'a', expect.objectContaining({ httpOnly: true }));
    expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'r', expect.objectContaining({ httpOnly: true }));
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('clears cookies on logout', async () => {
    const res: any = { clearCookie: jest.fn(), json: jest.fn() };
    await ctrl.logout({ cookies: { refresh_token: 'r' } } as any, res);
    expect(svc.logout).toHaveBeenCalledWith('r');
    expect(res.clearCookie).toHaveBeenCalledWith('access_token');
    expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- auth.controller.spec`.

- [ ] **Step 3: Implement `auth.controller.ts`**

```ts
import { Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthService, TokenPair } from './auth.service';

const cookieOpts = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.COOKIE_SECURE === 'true',
  domain: process.env.COOKIE_DOMAIN,
  path: '/',
});

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.login(dto.email, dto.password);
    this.writeCookies(res, tokens);
    res.json({ ok: true });
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token;
    if (!token) throw new UnauthorizedException();
    const tokens = await this.auth.refresh(token);
    this.writeCookies(res, tokens);
    res.json({ ok: true });
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.refresh_token);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.json({ ok: true });
  }

  private writeCookies(res: Response, tokens: TokenPair) {
    const accessMaxAge = Number(process.env.JWT_ACCESS_TTL ?? 3600) * 1000;
    const refreshMaxAge = Number(process.env.JWT_REFRESH_TTL ?? 604800) * 1000;
    res.cookie('access_token', tokens.accessToken, { ...cookieOpts(), maxAge: accessMaxAge });
    res.cookie('refresh_token', tokens.refreshToken, { ...cookieOpts(), maxAge: refreshMaxAge });
  }
}
```

- [ ] **Step 4: Implement `auth.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- auth.controller.spec`. Expected: 2 passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/auth
git commit -m "feat(api): auth controller with httpOnly cookies (login/refresh/logout)"
```

---

## Task 15: Wire guards globally + register AuthModule

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Update `app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }),
    PrismaModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Build to verify**

Run: `pnpm --filter @bymariap/api build`. Expected: success.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat(api): register global JwtAuthGuard + PermissionsGuard"
```

---

## Task 16: UsersService — /me endpoints (TDD)

**Files:**
- Create: `apps/api/src/modules/users/users.service.ts`
- Create: `apps/api/src/modules/users/users.service.spec.ts`
- Create: `apps/api/src/modules/users/dto/update-me.dto.ts`

- [ ] **Step 1: Write `update-me.dto.ts`**

```ts
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateMeDto {
  @IsOptional() @IsString() @Length(2, 80) fullName?: string;
  @IsOptional() @IsString() @Length(7, 20)  phone?: string;
}
```

- [ ] **Step 2: Write failing test `users.service.spec.ts`**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

const prisma = mock<PrismaService>();
const svc = new UsersService(prisma);

describe('UsersService.findMe', () => {
  beforeEach(() => mockReset(prisma));

  it('returns the current user without password hash', async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.c', fullName: 'A', phone: null,
      passwordHash: 'h', roleId: 'r1', role: { name: 'admin' },
      createdAt: new Date(), updatedAt: new Date(),
    });
    const out = await svc.findMe('u1');
    expect(out).not.toHaveProperty('passwordHash');
    expect(out.email).toBe('a@b.c');
  });

  it('throws 404 if user gone', async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.findMe('u1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('UsersService.updateMe', () => {
  beforeEach(() => mockReset(prisma));

  it('updates fullName and phone only', async () => {
    (prisma.user as any).update.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.c', fullName: 'New', phone: '300',
      passwordHash: 'h', roleId: 'r1', role: { name: 'admin' },
      createdAt: new Date(), updatedAt: new Date(),
    });
    const out = await svc.updateMe('u1', { fullName: 'New', phone: '300' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { fullName: 'New', phone: '300' },
      include: { role: true },
    });
    expect(out.fullName).toBe('New');
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- users.service.spec`.

- [ ] **Step 4: Implement `users.service.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }, include: { role: true },
    });
    if (!user) throw new NotFoundException();
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { fullName: dto.fullName, phone: dto.phone },
      include: { role: true },
    });
    const { passwordHash, ...safe } = updated;
    return safe;
  }
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- users.service.spec`. Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/users
git commit -m "feat(api): UsersService.findMe + updateMe"
```

---

## Task 17: UsersService — admin CRUD (TDD)

**Files:**
- Modify: `apps/api/src/modules/users/users.service.ts`
- Modify: `apps/api/src/modules/users/users.service.spec.ts`
- Create: `apps/api/src/modules/users/dto/create-user.dto.ts`
- Create: `apps/api/src/modules/users/dto/update-user.dto.ts`

- [ ] **Step 1: Write DTOs**

`create-user.dto.ts`:
```ts
import { IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @Length(2, 80) fullName!: string;
  @IsOptional() @IsString() @Length(7, 20) phone?: string;
  @IsString() roleId!: string;
}
```

`update-user.dto.ts`:
```ts
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateUserDto {
  @IsOptional() @IsString() @Length(2, 80) fullName?: string;
  @IsOptional() @IsString() @Length(7, 20) phone?: string;
  @IsOptional() @IsString() roleId?: string;
}
```

- [ ] **Step 2: Append tests to `users.service.spec.ts`**

```ts
describe('UsersService admin ops', () => {
  beforeEach(() => mockReset(prisma));

  it('creates a user with hashed password', async () => {
    (prisma.user as any).create.mockResolvedValueOnce({
      id: 'u2', email: 'x@y.z', fullName: 'X', phone: null,
      passwordHash: 'HASHED', roleId: 'r1', role: { name: 'admin' },
      createdAt: new Date(), updatedAt: new Date(),
    });
    const out = await svc.create({
      email: 'x@y.z', password: 'password1', fullName: 'X', roleId: 'r1',
    });
    const call = (prisma.user.create as jest.Mock).mock.calls[0][0];
    expect(call.data.passwordHash).not.toBe('password1');
    expect(call.data.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(out).not.toHaveProperty('passwordHash');
  });

  it('lists users without password hashes', async () => {
    (prisma.user as any).findMany.mockResolvedValueOnce([
      { id: 'u1', email: 'a@b.c', fullName: 'A', phone: null,
        passwordHash: 'h', roleId: 'r1', role: { name: 'admin' },
        createdAt: new Date(), updatedAt: new Date() },
    ]);
    const out = await svc.findAll();
    expect(out[0]).not.toHaveProperty('passwordHash');
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- users.service.spec`.

- [ ] **Step 4: Extend `users.service.ts`**

Add to imports:
```ts
import { hashPassword } from '../../common/crypto/password';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
```

Add methods:
```ts
async findAll() {
  const rows = await this.prisma.user.findMany({ include: { role: true } });
  return rows.map(({ passwordHash, ...u }) => u);
}

async findById(id: string) {
  const u = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
  if (!u) throw new NotFoundException();
  const { passwordHash, ...safe } = u;
  return safe;
}

async create(dto: CreateUserDto) {
  const u = await this.prisma.user.create({
    data: {
      email: dto.email,
      passwordHash: await hashPassword(dto.password),
      fullName: dto.fullName,
      phone: dto.phone,
      roleId: dto.roleId,
    },
    include: { role: true },
  });
  const { passwordHash, ...safe } = u;
  return safe;
}

async update(id: string, dto: UpdateUserDto) {
  const u = await this.prisma.user.update({
    where: { id },
    data: { fullName: dto.fullName, phone: dto.phone, roleId: dto.roleId },
    include: { role: true },
  });
  const { passwordHash, ...safe } = u;
  return safe;
}

async remove(id: string) {
  await this.prisma.user.delete({ where: { id } });
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- users.service.spec`. Expected: 5 passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/users
git commit -m "feat(api): UsersService admin CRUD"
```

---

## Task 18: UsersController + UsersModule

**Files:**
- Create: `apps/api/src/modules/users/users.controller.ts`
- Create: `apps/api/src/modules/users/users.module.ts`
- Modify: `apps/api/src/app.module.ts` to register UsersModule

- [ ] **Step 1: Write `users.controller.ts`**

```ts
import {
  Body, Controller, Delete, Get, Param, Patch, Post,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';

@Controller()
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) { return this.users.findMe(user.id); }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.id, dto);
  }

  @Get('admin/users')
  @RequirePermissions('users:read')
  list() { return this.users.findAll(); }

  @Get('admin/users/:id')
  @RequirePermissions('users:read')
  get(@Param('id') id: string) { return this.users.findById(id); }

  @Post('admin/users')
  @RequirePermissions('users:write')
  create(@Body() dto: CreateUserDto) { return this.users.create(dto); }

  @Patch('admin/users/:id')
  @RequirePermissions('users:write')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Delete('admin/users/:id')
  @RequirePermissions('users:write')
  remove(@Param('id') id: string) { return this.users.remove(id); }
}
```

- [ ] **Step 2: Write `users.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({ controllers: [UsersController], providers: [UsersService] })
export class UsersModule {}
```

- [ ] **Step 3: Register in `app.module.ts`**

Add `UsersModule` to `imports` array.

- [ ] **Step 4: Build, commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src
git commit -m "feat(api): users controller + module with /me and admin routes"
```

---

## Task 19: RbacService (TDD)

**Files:**
- Create: `apps/api/src/modules/rbac/rbac.service.ts`
- Create: `apps/api/src/modules/rbac/rbac.service.spec.ts`
- Create: `apps/api/src/modules/rbac/dto/create-role.dto.ts`
- Create: `apps/api/src/modules/rbac/dto/assign-permissions.dto.ts`

- [ ] **Step 1: Write DTOs**

`create-role.dto.ts`:
```ts
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateRoleDto {
  @IsString() @Length(2, 40) name!: string;
  @IsOptional() @IsString() description?: string;
}
```

`assign-permissions.dto.ts`:
```ts
import { IsArray, IsString } from 'class-validator';

export class AssignPermissionsDto {
  @IsArray() @IsString({ each: true }) permissionKeys!: string[];
}
```

- [ ] **Step 2: Write failing tests**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from './rbac.service';

const prisma = mock<PrismaService>();
const svc = new RbacService(prisma);

describe('RbacService', () => {
  beforeEach(() => mockReset(prisma));

  it('lists roles with permissions', async () => {
    (prisma.role as any).findMany.mockResolvedValueOnce([
      { id: 'r1', name: 'admin', description: null,
        permissions: [{ permission: { key: '*' } }] },
    ]);
    const out = await svc.listRoles();
    expect(out[0].permissions).toEqual(['*']);
  });

  it('creates a role', async () => {
    (prisma.role as any).create.mockResolvedValueOnce({
      id: 'r2', name: 'finance', description: null, permissions: [],
    });
    const out = await svc.createRole({ name: 'finance' });
    expect(out.name).toBe('finance');
  });

  it('assigns permissions by key (creates missing rows)', async () => {
    (prisma.role as any).findUnique.mockResolvedValueOnce({ id: 'r1', name: 'finance' });
    (prisma.permission as any).findMany.mockResolvedValueOnce([
      { id: 'p1', key: 'orders:read' },
    ]);
    (prisma.rolePermission as any).deleteMany.mockResolvedValueOnce({});
    (prisma.rolePermission as any).createMany.mockResolvedValueOnce({ count: 1 });

    await svc.assignPermissions('r1', ['orders:read']);
    expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'r1' } });
    expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
      data: [{ roleId: 'r1', permissionId: 'p1' }],
    });
  });

  it('throws if role missing on assign', async () => {
    (prisma.role as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.assignPermissions('x', [])).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- rbac.service.spec`.

- [ ] **Step 4: Implement `rbac.service.ts`**

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  async listRoles() {
    const rows = await this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
    });
    return rows.map((r) => ({
      id: r.id, name: r.name, description: r.description,
      permissions: r.permissions.map((rp) => rp.permission.key),
    }));
  }

  async createRole(dto: CreateRoleDto) {
    const row = await this.prisma.role.create({
      data: { name: dto.name, description: dto.description },
      include: { permissions: true },
    });
    return { id: row.id, name: row.name, description: row.description, permissions: [] };
  }

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { key: 'asc' } });
  }

  async assignPermissions(roleId: string, permissionKeys: string[]) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException();
    const perms = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });
    if (perms.length !== permissionKeys.length) {
      const known = perms.map((p) => p.key);
      const unknown = permissionKeys.filter((k) => !known.includes(k));
      throw new BadRequestException(`Unknown permission keys: ${unknown.join(', ')}`);
    }
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    await this.prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId, permissionId: p.id })),
    });
  }
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- rbac.service.spec`. Expected: 4 passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/rbac
git commit -m "feat(api): RbacService roles + permission assignment"
```

---

## Task 20: RbacController + RbacModule

**Files:**
- Create: `apps/api/src/modules/rbac/rbac.controller.ts`
- Create: `apps/api/src/modules/rbac/rbac.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write controller**

```ts
import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RbacService } from './rbac.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@Controller('admin/rbac')
@RequirePermissions('rbac:write')
export class RbacController {
  constructor(private rbac: RbacService) {}

  @Get('roles')             listRoles()                     { return this.rbac.listRoles(); }
  @Post('roles')            createRole(@Body() dto: CreateRoleDto) { return this.rbac.createRole(dto); }
  @Get('permissions')       listPerms()                     { return this.rbac.listPermissions(); }
  @Put('roles/:id/permissions')
  assign(@Param('id') id: string, @Body() dto: AssignPermissionsDto) {
    return this.rbac.assignPermissions(id, dto.permissionKeys);
  }
}
```

- [ ] **Step 2: Write `rbac.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';

@Module({ controllers: [RbacController], providers: [RbacService] })
export class RbacModule {}
```

- [ ] **Step 3: Register in `app.module.ts`**

Add `RbacModule` to `imports`.

- [ ] **Step 4: Build, commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src
git commit -m "feat(api): rbac controller + module"
```

---

## Task 21: Seed script

**Files:**
- Create: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Write seed**

```ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS: string[] = [
  '*',
  // users
  'users:read', 'users:write',
  // rbac
  'rbac:read', 'rbac:write',
  // products (defined for later phases, seeded now so role mapping is stable)
  'products:read', 'products:write',
  // orders
  'orders:read', 'orders:read:own', 'orders:write', 'orders:write:status',
  // invoices
  'invoices:read',
  // analytics
  'analytics:read',
  // customers
  'customers:read',
  // me
  'me:read', 'me:write',
  // cart
  'cart:read:own', 'cart:write:own',
  // appointments
  'appointments:read', 'appointments:read:own',
  'appointments:write', 'appointments:write:own',
  // availability
  'availability:read', 'availability:write:own',
  // services
  'services:read', 'services:write',
  // client-record
  'client-record:read:own_assigned', 'client-record:write:own_assigned',
];

const ROLE_PERMS: Record<string, string[]> = {
  admin:      ['*'],
  finance:    ['orders:read', 'orders:write:status', 'invoices:read', 'analytics:read', 'customers:read'],
  specialist: [
    'appointments:read:own', 'appointments:write:own', 'availability:write:own',
    'client-record:read:own_assigned', 'client-record:write:own_assigned', 'services:read',
  ],
  customer:   [
    'cart:read:own', 'cart:write:own',
    'orders:read:own',
    'appointments:read:own', 'appointments:write:own',
    'me:read', 'me:write',
  ],
};

async function main() {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }

  for (const roleName of Object.keys(ROLE_PERMS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName }, update: {}, create: { name: roleName },
    });
    const perms = await prisma.permission.findMany({
      where: { key: { in: ROLE_PERMS[roleName] } },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } });
  const email = process.env.SEED_ADMIN_EMAIL!;
  const pw = process.env.SEED_ADMIN_PASSWORD!;
  if (!email || !pw) throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD required');
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email, fullName: 'Admin', roleId: adminRole.id,
      passwordHash: await bcrypt.hash(pw, 12),
    },
  });
  console.log('seed: ok');
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run seed**

Run: `pnpm --filter @bymariap/api prisma:seed`. Expected: `seed: ok` printed, admin row exists.

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(api): seed roles, permissions, admin user"
```

---

## Task 22: Smoke E2E test (real DB via testcontainers)

**Files:**
- Create: `apps/api/test/jest-e2e.config.ts`
- Create: `apps/api/test/helpers/db.ts`
- Create: `apps/api/test/auth.e2e-spec.ts`

- [ ] **Step 1: Write `jest-e2e.config.ts`**

```ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '..',
  testRegex: 'test/.*\\.e2e-spec\\.ts$',
  testTimeout: 120_000,
};
export default config;
```

- [ ] **Step 2: Write `test/helpers/db.ts`**

```ts
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { execSync } from 'child_process';

export async function startTestDb(): Promise<{ url: string; stop: () => Promise<void>; container: StartedTestContainer; }> {
  const container = await new GenericContainer('postgres:16')
    .withEnvironment({ POSTGRES_PASSWORD: 'postgres', POSTGRES_DB: 'test' })
    .withExposedPorts(5432)
    .start();
  const url = `postgresql://postgres:postgres@${container.getHost()}:${container.getMappedPort(5432)}/test`;
  process.env.DATABASE_URL = url;
  execSync('pnpm prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } });
  return { url, container, stop: () => container.stop() };
}
```

- [ ] **Step 3: Write `auth.e2e-spec.ts`**

```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { execSync } from 'child_process';
import { AppModule } from '../src/app.module';
import { startTestDb } from './helpers/db';

describe('Auth E2E', () => {
  let app: INestApplication;
  let stopDb: () => Promise<void>;

  beforeAll(async () => {
    const db = await startTestDb();
    stopDb = db.stop;
    process.env.JWT_ACCESS_SECRET = 'test-access';
    process.env.JWT_REFRESH_SECRET = 'test-refresh';
    process.env.SEED_ADMIN_EMAIL = 'admin@bymariap.com';
    process.env.SEED_ADMIN_PASSWORD = 'admin-pass-123';
    execSync('pnpm prisma:seed', { stdio: 'inherit', env: process.env, cwd: __dirname + '/..' });

    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 120_000);

  afterAll(async () => { await app.close(); await stopDb(); });

  it('rejects /me without cookie', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
  });

  it('logs in and accesses /me', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@bymariap.com', password: 'admin-pass-123' })
      .expect(201);

    const cookies = login.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true);

    const me = await request(app.getHttpServer())
      .get('/me')
      .set('Cookie', cookies)
      .expect(200);
    expect(me.body.email).toBe('admin@bymariap.com');
  });

  it('admin can list users', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@bymariap.com', password: 'admin-pass-123' });
    const cookies = login.headers['set-cookie'] as unknown as string[];
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Cookie', cookies)
      .expect(200);
  });

  it('refresh rotates the token', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@bymariap.com', password: 'admin-pass-123' });
    const cookies = login.headers['set-cookie'] as unknown as string[];
    const refresh = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookies)
      .expect(201);
    expect(refresh.headers['set-cookie']).toBeDefined();
  });
});
```

- [ ] **Step 4: Run E2E**

Run: `pnpm --filter @bymariap/api test:e2e`. Expected: 4 passing. Requires Docker.

- [ ] **Step 5: Commit**

```bash
git add apps/api/test
git commit -m "test(api): auth e2e smoke (login, /me, admin users, refresh)"
```

---

## Task 23: README + final verification

**Files:**
- Create: `README.md` (root)

- [ ] **Step 1: Write `README.md`**

```markdown
# bymariap (rearquitectura NestJS)

Greenfield monorepo. Phase 1 ships the API foundation: auth, RBAC, users.

## Setup

```bash
pnpm install
docker run -d --name bymariap-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
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
```

- [ ] **Step 2: Run full verification suite**

Run:
```bash
pnpm --filter @bymariap/api typecheck
pnpm --filter @bymariap/api test
pnpm --filter @bymariap/api test:e2e
pnpm --filter @bymariap/api build
```

Expected: all green.

- [ ] **Step 3: Final commit**

```bash
git add README.md
git commit -m "docs: phase 1 setup + test instructions"
```

---

## Acceptance criteria (Phase 1)

- `POST /auth/login` issues access + refresh cookies for a seeded admin.
- `POST /auth/refresh` rotates both tokens and revokes the previous refresh.
- `POST /auth/logout` revokes the refresh token and clears cookies.
- `GET /me` returns the current user without `passwordHash`.
- `PATCH /me` updates `fullName` / `phone`.
- `GET /admin/users` returns the list to an admin; rejects 403 for non-`users:read` callers.
- `POST /admin/users` creates a user with a bcrypt-hashed password.
- `PUT /admin/rbac/roles/:id/permissions` replaces the role's permission set.
- `JwtAuthGuard` rejects requests without `access_token` cookie unless `@Public()`.
- `PermissionsGuard` enforces declared `@RequirePermissions(...)` with wildcard + scope coverage rules.
- Unit + E2E suites green.

## Out of scope (deferred to later phases)

- Products, Cart, Orders, Payments — Phase 3
- Storefront / Admin frontends — Phase 2 onwards
- Services, Availability, Appointments — Phase 5
- ClientRecord encryption, Consent versioning, DataAccessLog writes from accessing services — Phase 6
- Analytics dashboards — Phase 7
- Wompi webhooks, shipping zones, notifications cron — respective phase plans
