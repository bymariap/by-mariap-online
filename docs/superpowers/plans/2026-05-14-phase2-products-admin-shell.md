# Phase 2: Products + Categories + Admin Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Specialist subresource + Products + Categories to the API, and scaffold the Vite + React admin app with cookie-based auth, a protected shell, and full CRUD UIs for users, specialists, categories, and products.

**Architecture:** API stays NestJS + Prisma; new modules (`specialists`, `categories`, `products`) follow the same controller/service pattern as Phase 1. CORS opens to the admin origin with credentials so the existing httpOnly cookies work. The admin is a Vite SPA with React Router 6, TanStack Query for server state, react-hook-form + zod for forms, Tailwind + shadcn/ui for UI, and a thin `apiClient` (fetch with `credentials: 'include'`) that handles 401 â†’ redirect to login.

**Tech Stack additions:** Vite 5, React 18, React Router 6, TanStack Query 5, react-hook-form 7, zod 3, Tailwind 3, shadcn/ui, lucide-react, sonner (toasts).

**Prerequisites:** Phase 1 plan executed and merged. `apps/api` builds, tests pass, seed admin works.

**Scope (does NOT include):** cart, orders, payments, services, availability, appointments, client-record, notifications, analytics, storefront. Those are later phase plans. No image upload â€” admins paste URLs; an upload module comes in a later phase.

---

## File Structure (changes from Phase 1)

```
apps/
â”œâ”€â”€ api/
â”‚   â”œâ”€â”€ prisma/
â”‚   â”‚   â”œâ”€â”€ schema.prisma                 # +Product, Category, ProductCategory
â”‚   â”‚   â””â”€â”€ seed.ts                       # +categories/products when SEED_DEMO_DATA=true
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ main.ts                       # +CORS config
â”‚       â””â”€â”€ modules/
â”‚           â”œâ”€â”€ specialists/
â”‚           â”‚   â”œâ”€â”€ specialists.module.ts
â”‚           â”‚   â”œâ”€â”€ specialists.controller.ts
â”‚           â”‚   â”œâ”€â”€ specialists.controller.spec.ts
â”‚           â”‚   â”œâ”€â”€ specialists.service.ts
â”‚           â”‚   â”œâ”€â”€ specialists.service.spec.ts
â”‚           â”‚   â””â”€â”€ dto/
â”‚           â”‚       â””â”€â”€ upsert-specialist.dto.ts
â”‚           â”œâ”€â”€ categories/
â”‚           â”‚   â”œâ”€â”€ categories.module.ts
â”‚           â”‚   â”œâ”€â”€ categories.controller.ts
â”‚           â”‚   â”œâ”€â”€ categories.service.ts
â”‚           â”‚   â”œâ”€â”€ categories.service.spec.ts
â”‚           â”‚   â””â”€â”€ dto/
â”‚           â”‚       â”œâ”€â”€ create-category.dto.ts
â”‚           â”‚       â””â”€â”€ update-category.dto.ts
â”‚           â””â”€â”€ products/
â”‚               â”œâ”€â”€ products.module.ts
â”‚               â”œâ”€â”€ products.controller.ts
â”‚               â”œâ”€â”€ products.controller.spec.ts
â”‚               â”œâ”€â”€ products.service.ts
â”‚               â”œâ”€â”€ products.service.spec.ts
â”‚               â””â”€â”€ dto/
â”‚                   â”œâ”€â”€ create-product.dto.ts
â”‚                   â”œâ”€â”€ update-product.dto.ts
â”‚                   â””â”€â”€ list-products.query.ts
â””â”€â”€ admin/                                 # NEW
    â”œâ”€â”€ package.json
    â”œâ”€â”€ vite.config.ts
    â”œâ”€â”€ tsconfig.json
    â”œâ”€â”€ tsconfig.node.json
    â”œâ”€â”€ index.html
    â”œâ”€â”€ postcss.config.js
    â”œâ”€â”€ tailwind.config.ts
    â”œâ”€â”€ .env.example
    â””â”€â”€ src/
        â”œâ”€â”€ main.tsx
        â”œâ”€â”€ App.tsx
        â”œâ”€â”€ index.css
        â”œâ”€â”€ lib/
        â”‚   â”œâ”€â”€ api.ts                    # fetch wrapper, 401 handling
        â”‚   â”œâ”€â”€ query-client.ts
        â”‚   â””â”€â”€ utils.ts                  # cn() helper for shadcn
        â”œâ”€â”€ components/
        â”‚   â”œâ”€â”€ ui/                       # shadcn-generated (button, input, etc.)
        â”‚   â”œâ”€â”€ app-shell.tsx
        â”‚   â”œâ”€â”€ protected-route.tsx
        â”‚   â”œâ”€â”€ data-table.tsx
        â”‚   â””â”€â”€ form-field.tsx
        â”œâ”€â”€ features/
        â”‚   â”œâ”€â”€ auth/
        â”‚   â”‚   â”œâ”€â”€ auth-context.tsx
        â”‚   â”‚   â”œâ”€â”€ use-me.ts
        â”‚   â”‚   â””â”€â”€ login-page.tsx
        â”‚   â”œâ”€â”€ users/
        â”‚   â”‚   â”œâ”€â”€ users-page.tsx
        â”‚   â”‚   â”œâ”€â”€ user-form-dialog.tsx
        â”‚   â”‚   â””â”€â”€ api.ts
        â”‚   â”œâ”€â”€ specialists/
        â”‚   â”‚   â”œâ”€â”€ specialist-form-dialog.tsx
        â”‚   â”‚   â””â”€â”€ api.ts
        â”‚   â”œâ”€â”€ categories/
        â”‚   â”‚   â”œâ”€â”€ categories-page.tsx
        â”‚   â”‚   â”œâ”€â”€ category-form-dialog.tsx
        â”‚   â”‚   â””â”€â”€ api.ts
        â”‚   â””â”€â”€ products/
        â”‚       â”œâ”€â”€ products-page.tsx
        â”‚       â”œâ”€â”€ product-form-page.tsx
        â”‚       â””â”€â”€ api.ts
        â””â”€â”€ routes.tsx

packages/
â””â”€â”€ types/
    â””â”€â”€ src/index.ts                       # +Product, Category, Specialist DTO types
```

---

## Task 1: Extend Prisma schema with Product / Category

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [x] **Step 1: Append models to `schema.prisma`**

Add below the `DataAccessLog` model, replacing the `Future modules` comment:

```prisma
enum ProductStatus {
  draft
  published
  archived
}

model Category {
  id          String              @id @default(cuid())
  name        String
  slug        String              @unique
  products    ProductCategory[]
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
}

model Product {
  id            String            @id @default(cuid())
  name          String
  slug          String            @unique
  description   String?
  priceCop      Int               // colombian pesos, no decimals
  stockQuantity Int               @default(0)
  imageUrls     String[]          @default([])
  status        ProductStatus     @default(draft)
  categories    ProductCategory[]
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  @@index([status])
}

model ProductCategory {
  productId  String
  categoryId String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  @@id([productId, categoryId])
  @@index([categoryId])
}
```

- [x] **Step 2: Create migration**

Run:
```bash
pnpm --filter @bymariap/api prisma migrate dev --name products_and_categories
```

Expected: new migration file in `prisma/migrations/<ts>_products_and_categories/`. `Product`, `Category`, `ProductCategory`, `ProductStatus` exist in DB.

- [x] **Step 3: Commit**

```bash
git add apps/api/prisma
git commit -m "feat(api): prisma models for product, category, product-category"
```

---

## Task 2: Shared types for products & categories

**Files:**
- Modify: `packages/types/src/index.ts`

- [x] **Step 1: Append to `packages/types/src/index.ts`**

```ts
export type ProductStatus = 'draft' | 'published' | 'archived';

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
}

export interface ProductDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceCop: number;
  stockQuantity: number;
  imageUrls: string[];
  status: ProductStatus;
  categories: CategoryDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface SpecialistDTO {
  id: string;
  userId: string;
  bio: string | null;
  specialties: string[];
  avatarUrl: string | null;
}
```

- [x] **Step 2: Commit**

```bash
git add packages/types
git commit -m "feat(types): product, category, specialist DTOs"
```

---

## Task 3: SpecialistsService (TDD)

**Files:**
- Create: `apps/api/src/modules/specialists/specialists.service.ts`
- Create: `apps/api/src/modules/specialists/specialists.service.spec.ts`
- Create: `apps/api/src/modules/specialists/dto/upsert-specialist.dto.ts`

- [x] **Step 1: Write DTO `upsert-specialist.dto.ts`**

```ts
import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpsertSpecialistDto {
  @IsOptional() @IsString() @Length(0, 1000) bio?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(20) specialties?: string[];
  @IsOptional() @IsUrl() avatarUrl?: string;
}
```

- [x] **Step 2: Write failing test `specialists.service.spec.ts`**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpecialistsService } from './specialists.service';

const prisma = mock<PrismaService>();
const svc = new SpecialistsService(prisma);

describe('SpecialistsService', () => {
  beforeEach(() => mockReset(prisma));

  it('upserts a specialist when user has role specialist', async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce({
      id: 'u1', role: { name: 'specialist' },
    });
    (prisma.specialist as any).upsert.mockResolvedValueOnce({
      id: 's1', userId: 'u1', bio: 'hi', specialties: ['cejas'], avatarUrl: null,
    });
    const out = await svc.upsert('u1', { bio: 'hi', specialties: ['cejas'] });
    expect(out.id).toBe('s1');
    expect(prisma.specialist.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      create: { userId: 'u1', bio: 'hi', specialties: ['cejas'], avatarUrl: undefined },
      update: { bio: 'hi', specialties: ['cejas'], avatarUrl: undefined },
    });
  });

  it('rejects when user role is not specialist', async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce({
      id: 'u1', role: { name: 'customer' },
    });
    await expect(svc.upsert('u1', {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws 404 when user not found', async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.upsert('x', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists specialists with linked user data', async () => {
    (prisma.specialist as any).findMany.mockResolvedValueOnce([
      {
        id: 's1', userId: 'u1', bio: null, specialties: [], avatarUrl: null,
        user: { id: 'u1', fullName: 'A', email: 'a@b.c' },
      },
    ]);
    const out = await svc.findAll();
    expect(out[0].user.fullName).toBe('A');
  });
});
```

- [ ] **Step 3: Run â€” expect FAIL**

Run: `pnpm --filter @bymariap/api test -- specialists.service.spec`. Expected: module not found.

- [x] **Step 4: Implement `specialists.service.ts`**

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertSpecialistDto } from './dto/upsert-specialist.dto';

@Injectable()
export class SpecialistsService {
  constructor(private prisma: PrismaService) {}

  async upsert(userId: string, dto: UpsertSpecialistDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }, include: { role: true },
    });
    if (!user) throw new NotFoundException();
    if (user.role.name !== 'specialist') {
      throw new BadRequestException('User role must be "specialist" to assign a specialist profile');
    }
    return this.prisma.specialist.upsert({
      where: { userId },
      create: {
        userId, bio: dto.bio, specialties: dto.specialties ?? [], avatarUrl: dto.avatarUrl,
      },
      update: {
        bio: dto.bio, specialties: dto.specialties, avatarUrl: dto.avatarUrl,
      },
    });
  }

  async findAll() {
    return this.prisma.specialist.findMany({
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { user: { fullName: 'asc' } },
    });
  }

  async findByUserId(userId: string) {
    const s = await this.prisma.specialist.findUnique({
      where: { userId },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    if (!s) throw new NotFoundException();
    return s;
  }

  async remove(userId: string) {
    await this.prisma.specialist.delete({ where: { userId } });
  }
}
```

- [ ] **Step 5: Run â€” expect PASS**

Run: `pnpm --filter @bymariap/api test -- specialists.service.spec`. Expected: 4 passing.

- [x] **Step 6: Commit**

```bash
git add apps/api/src/modules/specialists
git commit -m "feat(api): SpecialistsService upsert/findAll/remove with role check"
```

---

## Task 4: SpecialistsController + module

**Files:**
- Create: `apps/api/src/modules/specialists/specialists.controller.ts`
- Create: `apps/api/src/modules/specialists/specialists.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [x] **Step 1: Write controller**

```ts
import {
  Body, Controller, Delete, Get, Param, Put,
} from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { SpecialistsService } from './specialists.service';
import { UpsertSpecialistDto } from './dto/upsert-specialist.dto';

@Controller('admin/specialists')
@RequirePermissions('users:write')
export class SpecialistsController {
  constructor(private svc: SpecialistsService) {}

  @Get()
  list() { return this.svc.findAll(); }

  @Get(':userId')
  get(@Param('userId') userId: string) { return this.svc.findByUserId(userId); }

  @Put(':userId')
  upsert(@Param('userId') userId: string, @Body() dto: UpsertSpecialistDto) {
    return this.svc.upsert(userId, dto);
  }

  @Delete(':userId')
  remove(@Param('userId') userId: string) { return this.svc.remove(userId); }
}
```

- [x] **Step 2: Write `specialists.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { SpecialistsController } from './specialists.controller';
import { SpecialistsService } from './specialists.service';

@Module({ controllers: [SpecialistsController], providers: [SpecialistsService] })
export class SpecialistsModule {}
```

- [x] **Step 3: Register in `apps/api/src/app.module.ts`**

Add `SpecialistsModule` to the `imports` array.

- [x] **Step 4: Build, commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src
git commit -m "feat(api): specialists controller + module"
```

---

## Task 5: CategoriesService (TDD)

**Files:**
- Create: `apps/api/src/modules/categories/categories.service.ts`
- Create: `apps/api/src/modules/categories/categories.service.spec.ts`
- Create: `apps/api/src/modules/categories/dto/create-category.dto.ts`
- Create: `apps/api/src/modules/categories/dto/update-category.dto.ts`

- [x] **Step 1: Write DTOs**

`create-category.dto.ts`:
```ts
import { IsString, Length, Matches } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @Length(2, 60) name!: string;
  @IsString() @Length(2, 60) @Matches(/^[a-z0-9-]+$/, { message: 'slug must be kebab-case lowercase' })
  slug!: string;
}
```

`update-category.dto.ts`:
```ts
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional() @IsString() @Length(2, 60) name?: string;
  @IsOptional() @IsString() @Length(2, 60) @Matches(/^[a-z0-9-]+$/) slug?: string;
}
```

- [x] **Step 2: Write failing test**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriesService } from './categories.service';

const prisma = mock<PrismaService>();
const svc = new CategoriesService(prisma);

describe('CategoriesService', () => {
  beforeEach(() => mockReset(prisma));

  it('lists categories alphabetically', async () => {
    (prisma.category as any).findMany.mockResolvedValueOnce([
      { id: 'c1', name: 'Aceites', slug: 'aceites', createdAt: new Date(), updatedAt: new Date() },
    ]);
    const out = await svc.findAll();
    expect(out[0].slug).toBe('aceites');
    expect((prisma.category.findMany as jest.Mock).mock.calls[0][0]).toEqual({
      orderBy: { name: 'asc' },
    });
  });

  it('creates a category', async () => {
    (prisma.category as any).create.mockResolvedValueOnce({
      id: 'c2', name: 'Cejas', slug: 'cejas', createdAt: new Date(), updatedAt: new Date(),
    });
    const out = await svc.create({ name: 'Cejas', slug: 'cejas' });
    expect(out.id).toBe('c2');
  });

  it('throws 409 on duplicate slug', async () => {
    (prisma.category as any).create.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    );
    await expect(svc.create({ name: 'X', slug: 'x' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws 404 on update missing', async () => {
    (prisma.category as any).update.mockRejectedValueOnce(
      Object.assign(new Error('not found'), { code: 'P2025' }),
    );
    await expect(svc.update('x', { name: 'Y' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [x] **Step 3: Run â€” expect FAIL**

Run: `pnpm --filter @bymariap/api test -- categories.service.spec`.

- [x] **Step 4: Implement `categories.service.ts`**

```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    const c = await this.prisma.category.findUnique({ where: { id } });
    if (!c) throw new NotFoundException();
    return c;
  }

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({ data: dto });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('Slug already exists');
      throw e;
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    try {
      return await this.prisma.category.update({ where: { id }, data: dto });
    } catch (e: any) {
      if (e.code === 'P2025') throw new NotFoundException();
      if (e.code === 'P2002') throw new ConflictException('Slug already exists');
      throw e;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (e: any) {
      if (e.code === 'P2025') throw new NotFoundException();
      throw e;
    }
  }
}
```

- [x] **Step 5: Run â€” expect PASS**

Run: `pnpm --filter @bymariap/api test -- categories.service.spec`. Expected: 4 passing.

- [x] **Step 6: Commit**

```bash
git add apps/api/src/modules/categories
git commit -m "feat(api): CategoriesService CRUD"
```

---

## Task 6: CategoriesController + module

**Files:**
- Create: `apps/api/src/modules/categories/categories.controller.ts`
- Create: `apps/api/src/modules/categories/categories.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [x] **Step 1: Write controller**

```ts
import {
  Body, Controller, Delete, Get, Param, Patch, Post,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller()
export class CategoriesController {
  constructor(private svc: CategoriesService) {}

  @Public()
  @Get('store/categories')
  publicList() { return this.svc.findAll(); }

  @Get('admin/categories')
  @RequirePermissions('products:write')
  list() { return this.svc.findAll(); }

  @Get('admin/categories/:id')
  @RequirePermissions('products:write')
  get(@Param('id') id: string) { return this.svc.findById(id); }

  @Post('admin/categories')
  @RequirePermissions('products:write')
  create(@Body() dto: CreateCategoryDto) { return this.svc.create(dto); }

  @Patch('admin/categories/:id')
  @RequirePermissions('products:write')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.svc.update(id, dto);
  }

  @Delete('admin/categories/:id')
  @RequirePermissions('products:write')
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
```

- [x] **Step 2: Write `categories.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({ controllers: [CategoriesController], providers: [CategoriesService] })
export class CategoriesModule {}
```

- [x] **Step 3: Register in `apps/api/src/app.module.ts`**

Add `CategoriesModule` to `imports`.

- [x] **Step 4: Build, commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src
git commit -m "feat(api): categories controller with public store + admin routes"
```

---

## Task 7: ProductsService (TDD)

**Files:**
- Create: `apps/api/src/modules/products/products.service.ts`
- Create: `apps/api/src/modules/products/products.service.spec.ts`
- Create: `apps/api/src/modules/products/dto/create-product.dto.ts`
- Create: `apps/api/src/modules/products/dto/update-product.dto.ts`
- Create: `apps/api/src/modules/products/dto/list-products.query.ts`

- [x] **Step 1: Write DTOs**

`create-product.dto.ts`:
```ts
import {
  ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, IsUrl, Length, Matches, Min,
} from 'class-validator';
import { ProductStatus } from '@prisma/client';

export class CreateProductDto {
  @IsString() @Length(2, 120) name!: string;
  @IsString() @Length(2, 140) @Matches(/^[a-z0-9-]+$/) slug!: string;
  @IsOptional() @IsString() @Length(0, 5000) description?: string;
  @IsInt() @Min(0) priceCop!: number;
  @IsInt() @Min(0) stockQuantity!: number;
  @IsArray() @IsUrl({}, { each: true }) @ArrayMaxSize(10) imageUrls!: string[];
  @IsArray() @IsString({ each: true }) categoryIds!: string[];
  @IsEnum(ProductStatus) status!: ProductStatus;
}
```

`update-product.dto.ts`:
```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

`list-products.query.ts`:
```ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProductStatus } from '@prisma/client';

export class ListProductsQuery {
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsString() categorySlug?: string;
  @IsOptional() @IsString() search?: string;
}
```

- [x] **Step 2: Install `@nestjs/mapped-types`**

Run:
```bash
pnpm --filter @bymariap/api add @nestjs/mapped-types
```

- [x] **Step 3: Write failing test `products.service.spec.ts`**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from './products.service';

const prisma = mock<PrismaService>();
const svc = new ProductsService(prisma);

const productRow = {
  id: 'p1', name: 'X', slug: 'x', description: null,
  priceCop: 50000, stockQuantity: 10, imageUrls: [], status: 'draft',
  categories: [{ category: { id: 'c1', name: 'Cejas', slug: 'cejas' } }],
  createdAt: new Date(), updatedAt: new Date(),
};

describe('ProductsService', () => {
  beforeEach(() => mockReset(prisma));

  it('creates a product with category links', async () => {
    (prisma.product as any).create.mockResolvedValueOnce(productRow);
    const out = await svc.create({
      name: 'X', slug: 'x', priceCop: 50000, stockQuantity: 10,
      imageUrls: [], categoryIds: ['c1'], status: 'draft' as any,
    });
    expect(out.categories[0].slug).toBe('cejas');
    const call = (prisma.product.create as jest.Mock).mock.calls[0][0];
    expect(call.data.categories.create).toEqual([{ categoryId: 'c1' }]);
  });

  it('rejects duplicate slug as 409', async () => {
    (prisma.product as any).create.mockRejectedValueOnce(
      Object.assign(new Error(), { code: 'P2002' }),
    );
    await expect(svc.create({
      name: 'X', slug: 'x', priceCop: 1, stockQuantity: 0,
      imageUrls: [], categoryIds: [], status: 'draft' as any,
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates replaces categories atomically', async () => {
    (prisma.$transaction as any).mockImplementationOnce(async (fn: any) => {
      const tx = {
        productCategory: { deleteMany: jest.fn().mockResolvedValue({}) },
        product: { update: jest.fn().mockResolvedValueOnce(productRow) },
      };
      return fn(tx);
    });
    const out = await svc.update('p1', { categoryIds: ['c2'] });
    expect(out.id).toBe('p1');
  });

  it('filters public list to published only', async () => {
    (prisma.product as any).findMany.mockResolvedValueOnce([productRow]);
    await svc.findPublic({});
    const call = (prisma.product.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.status).toBe('published');
  });

  it('admin list includes all statuses', async () => {
    (prisma.product as any).findMany.mockResolvedValueOnce([productRow]);
    await svc.findAdmin({});
    const call = (prisma.product.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.status).toBeUndefined();
  });

  it('throws 404 on findBySlug missing', async () => {
    (prisma.product as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.findBySlug('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [x] **Step 4: Run â€” expect FAIL**

Run: `pnpm --filter @bymariap/api test -- products.service.spec`.

- [x] **Step 5: Implement `products.service.ts`**

```ts
import {
  ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsQuery } from './dto/list-products.query';

const INCLUDE = {
  categories: { include: { category: true } },
} satisfies Prisma.ProductInclude;

function shape(row: any) {
  return {
    ...row,
    categories: row.categories.map((pc: any) => pc.category),
  };
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAdmin(q: ListProductsQuery) {
    const rows = await this.prisma.product.findMany({
      where: this.where(q, false),
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(shape);
  }

  async findPublic(q: ListProductsQuery) {
    const rows = await this.prisma.product.findMany({
      where: this.where(q, true),
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(shape);
  }

  async findById(id: string) {
    const row = await this.prisma.product.findUnique({ where: { id }, include: INCLUDE });
    if (!row) throw new NotFoundException();
    return shape(row);
  }

  async findBySlug(slug: string) {
    const row = await this.prisma.product.findUnique({ where: { slug }, include: INCLUDE });
    if (!row) throw new NotFoundException();
    return shape(row);
  }

  async create(dto: CreateProductDto) {
    try {
      const row = await this.prisma.product.create({
        data: {
          name: dto.name, slug: dto.slug, description: dto.description,
          priceCop: dto.priceCop, stockQuantity: dto.stockQuantity,
          imageUrls: dto.imageUrls, status: dto.status,
          categories: { create: dto.categoryIds.map((categoryId) => ({ categoryId })) },
        },
        include: INCLUDE,
      });
      return shape(row);
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('Slug already exists');
      throw e;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.categoryIds) {
          await tx.productCategory.deleteMany({ where: { productId: id } });
        }
        const { categoryIds, ...rest } = dto;
        const row = await tx.product.update({
          where: { id },
          data: {
            ...rest,
            ...(categoryIds && {
              categories: { create: categoryIds.map((cid) => ({ categoryId: cid })) },
            }),
          },
          include: INCLUDE,
        });
        return shape(row);
      });
    } catch (e: any) {
      if (e.code === 'P2025') throw new NotFoundException();
      if (e.code === 'P2002') throw new ConflictException('Slug already exists');
      throw e;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (e: any) {
      if (e.code === 'P2025') throw new NotFoundException();
      throw e;
    }
  }

  private where(q: ListProductsQuery, publicOnly: boolean): Prisma.ProductWhereInput {
    return {
      ...(publicOnly ? { status: 'published' } : q.status ? { status: q.status } : {}),
      ...(q.categorySlug
        ? { categories: { some: { category: { slug: q.categorySlug } } } }
        : {}),
      ...(q.search
        ? { OR: [
            { name: { contains: q.search, mode: 'insensitive' } },
            { slug: { contains: q.search, mode: 'insensitive' } },
          ] }
        : {}),
    };
  }
}
```

- [x] **Step 6: Run â€” expect PASS**

Run: `pnpm --filter @bymariap/api test -- products.service.spec`. Expected: 6 passing.

- [x] **Step 7: Commit**

```bash
git add apps/api/src/modules/products pnpm-lock.yaml apps/api/package.json
git commit -m "feat(api): ProductsService with category links + admin/public listing"
```

---

## Task 8: ProductsController + module

**Files:**
- Create: `apps/api/src/modules/products/products.controller.ts`
- Create: `apps/api/src/modules/products/products.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [x] **Step 1: Write controller**

```ts
import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsQuery } from './dto/list-products.query';

@Controller()
export class ProductsController {
  constructor(private svc: ProductsService) {}

  @Public()
  @Get('store/products')
  publicList(@Query() q: ListProductsQuery) { return this.svc.findPublic(q); }

  @Public()
  @Get('store/products/:slug')
  publicBySlug(@Param('slug') slug: string) { return this.svc.findBySlug(slug); }

  @Get('admin/products')
  @RequirePermissions('products:read')
  list(@Query() q: ListProductsQuery) { return this.svc.findAdmin(q); }

  @Get('admin/products/:id')
  @RequirePermissions('products:read')
  get(@Param('id') id: string) { return this.svc.findById(id); }

  @Post('admin/products')
  @RequirePermissions('products:write')
  create(@Body() dto: CreateProductDto) { return this.svc.create(dto); }

  @Patch('admin/products/:id')
  @RequirePermissions('products:write')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.svc.update(id, dto);
  }

  @Delete('admin/products/:id')
  @RequirePermissions('products:write')
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
```

- [x] **Step 2: Write `products.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({ controllers: [ProductsController], providers: [ProductsService] })
export class ProductsModule {}
```

- [x] **Step 3: Register in `apps/api/src/app.module.ts`**

Add `ProductsModule` to `imports`.

- [x] **Step 4: Build, commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src
git commit -m "feat(api): products controller (public store + admin)"
```

---

## Task 9: CORS configuration for admin

**Files:**
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/.env.example`

- [x] **Step 1: Update `.env.example`**

Append:
```
ADMIN_ORIGIN=http://localhost:5173
```

- [x] **Step 2: Update `apps/api/src/main.ts` bootstrap**

Replace the body of `bootstrap()` so it reads:

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({
    origin: (process.env.ADMIN_ORIGIN ?? 'http://localhost:5173').split(','),
    credentials: true,
  });
  await app.listen(Number(process.env.PORT ?? 3001));
}
```

- [x] **Step 3: Build, commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api
git commit -m "feat(api): enable CORS with credentials for admin origin"
```

---

## Task 10: Update seed with demo data

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [x] **Step 1: Append demo data block (guarded by `SEED_DEMO_DATA`)**

Add at the end of `main()` in `seed.ts`, before `console.log('seed: ok')`:

```ts
if (process.env.SEED_DEMO_DATA === 'true') {
  const cats = [
    { name: 'Cejas', slug: 'cejas' },
    { name: 'PestaÃ±as', slug: 'pestanas' },
    { name: 'Cuidado en casa', slug: 'cuidado-casa' },
  ];
  for (const c of cats) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  const cejas = await prisma.category.findUniqueOrThrow({ where: { slug: 'cejas' } });
  const casa = await prisma.category.findUniqueOrThrow({ where: { slug: 'cuidado-casa' } });

  const products = [
    { name: 'SÃ©rum fortalecedor de cejas', slug: 'serum-cejas', priceCop: 65000, categoryIds: [cejas.id, casa.id] },
    { name: 'Pinzas profesionales', slug: 'pinzas-pro', priceCop: 45000, categoryIds: [cejas.id] },
    { name: 'Aceite reparador pestaÃ±as', slug: 'aceite-pestanas', priceCop: 55000, categoryIds: [casa.id] },
  ];
  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) continue;
    await prisma.product.create({
      data: {
        name: p.name, slug: p.slug, priceCop: p.priceCop,
        stockQuantity: 20, imageUrls: [], status: 'published',
        categories: { create: p.categoryIds.map((id) => ({ categoryId: id })) },
      },
    });
  }
}
```

- [x] **Step 2: Run seed with demo data**

Run: `SEED_DEMO_DATA=true pnpm --filter @bymariap/api prisma:seed`. Expected: 3 categories + 3 products in DB.

- [x] **Step 3: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(api): demo seed for categories + products behind SEED_DEMO_DATA flag"
```

---

## Task 11: Scaffold Vite + React admin app

**Files:**
- Create: `apps/admin/package.json`, `apps/admin/vite.config.ts`, `apps/admin/tsconfig.json`, `apps/admin/tsconfig.node.json`, `apps/admin/index.html`, `apps/admin/.env.example`, `apps/admin/src/main.tsx`, `apps/admin/src/App.tsx`, `apps/admin/src/index.css`

- [x] **Step 1: Create `apps/admin/package.json`**

```json
{
  "name": "@bymariap/admin",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint \"src/**/*.{ts,tsx}\""
  },
  "dependencies": {
    "@bymariap/types": "workspace:*",
    "@hookform/resolvers": "^3.4.0",
    "@tanstack/react-query": "^5.40.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.395.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.52.0",
    "react-router-dom": "^6.24.0",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.3.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@bymariap/config-tsconfig": "workspace:*",
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.0",
    "vite": "^5.3.0"
  }
}
```

- [x] **Step 2: Create `apps/admin/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 5173 },
});
```

- [x] **Step 3: Create `apps/admin/tsconfig.json`**

```json
{
  "extends": "@bymariap/config-tsconfig/base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "noEmit": true,
    "useDefineForClassFields": true,
    "allowImportingTsExtensions": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [x] **Step 4: Create `apps/admin/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [x] **Step 5: Create `apps/admin/index.html`**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>by mariap â€” admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [x] **Step 6: Create `apps/admin/.env.example`**

```
VITE_API_BASE_URL=http://localhost:3001
```

- [x] **Step 7: Create `apps/admin/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [x] **Step 8: Create stub `apps/admin/src/App.tsx`**

```tsx
export default function App() {
  return <div className="p-6">admin shell loadingâ€¦</div>;
}
```

- [x] **Step 9: Create `apps/admin/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [x] **Step 10: Install + dev sanity check**

Run:
```bash
cp apps/admin/.env.example apps/admin/.env
pnpm install
pnpm --filter @bymariap/admin dev
```

Expected: vite dev server listens on http://localhost:5173, page shows "admin shell loadingâ€¦". Stop with Ctrl+C.

- [x] **Step 11: Commit**

```bash
git add apps/admin pnpm-lock.yaml
git commit -m "feat(admin): scaffold vite + react app"
```

---

## Task 12: Tailwind + shadcn setup

**Files:**
- Create: `apps/admin/tailwind.config.ts`, `apps/admin/postcss.config.js`, `apps/admin/src/lib/utils.ts`

- [x] **Step 1: Create `apps/admin/postcss.config.js`**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [x] **Step 2: Create `apps/admin/tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
      },
      borderRadius: { lg: '0.5rem', md: '0.375rem', sm: '0.25rem' },
    },
  },
  plugins: [],
} satisfies Config;
```

- [x] **Step 3: Replace `apps/admin/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 4%;
    --border: 240 6% 90%;
    --primary: 240 6% 15%;
    --primary-foreground: 0 0% 98%;
    --muted: 240 5% 96%;
    --muted-foreground: 240 4% 46%;
    --destructive: 0 75% 50%;
    --destructive-foreground: 0 0% 98%;
  }
  body { @apply bg-background text-foreground; }
}
```

- [x] **Step 4: Create `apps/admin/src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCop(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}
```

- [x] **Step 5: Verify styles work**

Edit `App.tsx`:
```tsx
export default function App() {
  return <div className="p-6 text-primary">admin shell â€” tailwind ok</div>;
}
```

Run: `pnpm --filter @bymariap/admin dev`, open http://localhost:5173 â†’ text renders with primary color. Stop.

- [x] **Step 6: Commit**

```bash
git add apps/admin
git commit -m "feat(admin): tailwind + design tokens + cn/formatCop helpers"
```

---

## Task 13: Generate minimal shadcn-style UI primitives

> We hand-write the few components needed instead of running the shadcn CLI to keep the toolchain simple. Each is a thin wrapper conforming to shadcn API.

**Files:**
- Create: `apps/admin/src/components/ui/button.tsx`
- Create: `apps/admin/src/components/ui/input.tsx`
- Create: `apps/admin/src/components/ui/label.tsx`
- Create: `apps/admin/src/components/ui/textarea.tsx`
- Create: `apps/admin/src/components/ui/dialog.tsx`
- Create: `apps/admin/src/components/ui/table.tsx`
- Create: `apps/admin/src/components/ui/select.tsx`
- Create: `apps/admin/src/components/ui/badge.tsx`

- [x] **Step 1: `button.tsx`**

```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md';

const styles: Record<Variant, string> = {
  default:     'bg-primary text-primary-foreground hover:opacity-90',
  outline:     'border border-border bg-background hover:bg-muted',
  ghost:       'hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
};
const sizes: Record<Size, string> = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm' };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition disabled:opacity-50 disabled:pointer-events-none',
        styles[variant], sizes[size], className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
```

- [x] **Step 2: `input.tsx`**

```tsx
import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-border bg-background px-3 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary/30',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
```

- [x] **Step 3: `label.tsx`**

```tsx
import { LabelHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn('text-sm font-medium leading-none', className)} {...props} />
  ),
);
Label.displayName = 'Label';
```

- [x] **Step 4: `textarea.tsx`**

```tsx
import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary/30',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
```

- [x] **Step 5: `dialog.tsx`** (lightweight native dialog wrapper)

```tsx
import { ReactNode, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, title, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={() => onOpenChange(false)}
      className={cn('rounded-lg p-0 backdrop:bg-black/40 w-full max-w-lg', className)}
    >
      <div className="p-6 space-y-4">
        <header className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground">âœ•</button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
```

- [x] **Step 6: `table.tsx`**

```tsx
import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Table = ({ className, ...p }: HTMLAttributes<HTMLTableElement>) =>
  <table className={cn('w-full text-sm', className)} {...p} />;
export const THead = ({ className, ...p }: HTMLAttributes<HTMLTableSectionElement>) =>
  <thead className={cn('bg-muted text-left', className)} {...p} />;
export const TBody = (p: HTMLAttributes<HTMLTableSectionElement>) => <tbody {...p} />;
export const TR    = ({ className, ...p }: HTMLAttributes<HTMLTableRowElement>) =>
  <tr className={cn('border-b border-border', className)} {...p} />;
export const TH    = ({ className, ...p }: HTMLAttributes<HTMLTableCellElement>) =>
  <th className={cn('px-3 py-2 font-medium', className)} {...p} />;
export const TD    = ({ className, ...p }: HTMLAttributes<HTMLTableCellElement>) =>
  <td className={cn('px-3 py-2', className)} {...p} />;
```

- [x] **Step 7: `select.tsx`**

```tsx
import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-border bg-background px-3 text-sm',
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = 'Select';
```

- [x] **Step 8: `badge.tsx`**

```tsx
import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Badge({ className, ...p }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-block rounded-full bg-muted px-2 py-0.5 text-xs', className)} {...p} />;
}
```

- [x] **Step 9: Commit**

```bash
git add apps/admin/src/components/ui
git commit -m "feat(admin): minimal shadcn-style UI primitives"
```

---

## Task 14: API client (fetch wrapper with 401 redirect)

**Files:**
- Create: `apps/admin/src/lib/api.ts`
- Create: `apps/admin/src/lib/query-client.ts`

- [x] **Step 1: Write `api.ts`**

```ts
const BASE = import.meta.env.VITE_API_BASE_URL as string;

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, msg: string) {
    super(msg);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !path.startsWith('/auth/')) {
    // bubble; AuthProvider will route to /login on this
    const data = await safeJson(res);
    throw new ApiError(401, data, 'Unauthorized');
  }
  if (!res.ok) {
    const data = await safeJson(res);
    throw new ApiError(res.status, data, (data as any)?.message ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function safeJson(res: Response): Promise<unknown> {
  try { return await res.json(); } catch { return null; }
}

export const api = {
  get:    <T>(p: string) => request<T>('GET', p),
  post:   <T>(p: string, body?: unknown) => request<T>('POST', p, body),
  patch:  <T>(p: string, body?: unknown) => request<T>('PATCH', p, body),
  put:    <T>(p: string, body?: unknown) => request<T>('PUT', p, body),
  delete: <T = void>(p: string) => request<T>('DELETE', p),
};
```

- [x] **Step 2: Write `query-client.ts`**

```ts
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403 || err.status === 404)) return false;
        return count < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});
```

- [x] **Step 3: Commit**

```bash
git add apps/admin/src/lib
git commit -m "feat(admin): fetch api wrapper + tanstack query client"
```

---

## Task 15: Auth context + login page

**Files:**
- Create: `apps/admin/src/features/auth/auth-context.tsx`
- Create: `apps/admin/src/features/auth/use-me.ts`
- Create: `apps/admin/src/features/auth/login-page.tsx`

- [x] **Step 1: Write `use-me.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';

export interface Me {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: { id: string; name: string };
}

export function useMe() {
  return useQuery<Me, ApiError>({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/me'),
  });
}
```

- [x] **Step 2: Write `auth-context.tsx`**

```tsx
import { createContext, ReactNode, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useMe, Me } from './use-me';

interface AuthCtx {
  user: Me | undefined;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const me = useMe();

  async function login(email: string, password: string) {
    await api.post('/auth/login', { email, password });
    await qc.invalidateQueries({ queryKey: ['me'] });
  }
  async function logout() {
    await api.post('/auth/logout');
    qc.clear();
  }

  return (
    <Ctx.Provider value={{ user: me.data, loading: me.isLoading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
```

- [x] **Step 3: Write `login-page.tsx`**

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from './auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      await login(values.email, values.password);
      nav('/products', { replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? 'Login failed');
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-muted">
      <form onSubmit={form.handleSubmit(onSubmit)} className="bg-background p-8 rounded-lg shadow w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">by mariap â€” admin</h1>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register('email')} />
          <p className="text-xs text-destructive">{form.formState.errors.email?.message}</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">ContraseÃ±a</Label>
          <Input id="password" type="password" {...form.register('password')} />
          <p className="text-xs text-destructive">{form.formState.errors.password?.message}</p>
        </div>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>Entrar</Button>
      </form>
    </div>
  );
}
```

- [x] **Step 4: Commit**

```bash
git add apps/admin/src/features/auth
git commit -m "feat(admin): auth context + login page"
```

---

## Task 16: Protected route + app shell + router

**Files:**
- Create: `apps/admin/src/components/protected-route.tsx`
- Create: `apps/admin/src/components/app-shell.tsx`
- Create: `apps/admin/src/routes.tsx`
- Modify: `apps/admin/src/App.tsx`

- [x] **Step 1: Write `protected-route.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">Cargandoâ€¦</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
```

- [x] **Step 2: Write `app-shell.tsx`**

```tsx
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/products', label: 'Productos' },
  { to: '/categories', label: 'CategorÃ­as' },
  { to: '/users', label: 'Usuarios' },
  { to: '/specialists', label: 'Especialistas' },
];

export function AppShell() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen grid grid-cols-[220px_1fr]">
      <aside className="bg-muted border-r border-border p-4 space-y-4">
        <div className="font-semibold">by mariap</div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn('px-3 py-2 rounded-md text-sm', isActive ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground')
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-4 left-4 right-4 text-xs space-y-2">
          <div>{user?.email}</div>
          <Button variant="outline" size="sm" onClick={logout} className="w-full">Salir</Button>
        </div>
      </aside>
      <main className="p-6"><Outlet /></main>
    </div>
  );
}
```

- [x] **Step 3: Write `routes.tsx`**

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/features/auth/login-page';
import { ProtectedRoute } from '@/components/protected-route';
import { AppShell } from '@/components/app-shell';
import { ProductsPage } from '@/features/products/products-page';
import { ProductFormPage } from '@/features/products/product-form-page';
import { CategoriesPage } from '@/features/categories/categories-page';
import { UsersPage } from '@/features/users/users-page';
import { SpecialistsPage } from '@/features/specialists/specialists-page';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Navigate to="/products" replace /> },
          { path: '/products', element: <ProductsPage /> },
          { path: '/products/new', element: <ProductFormPage /> },
          { path: '/products/:id', element: <ProductFormPage /> },
          { path: '/categories', element: <CategoriesPage /> },
          { path: '/users', element: <UsersPage /> },
          { path: '/specialists', element: <SpecialistsPage /> },
        ],
      },
    ],
  },
]);
```

- [x] **Step 4: Rewrite `App.tsx`**

```tsx
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/features/auth/auth-context';
import { router } from '@/routes';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

- [x] **Step 5: Build, commit (pages still missing â€” next tasks)**

We commit after Task 17 once stub pages exist so the build passes. Continue.

---

## Task 17: Products feature â€” list page

**Files:**
- Create: `apps/admin/src/features/products/api.ts`
- Create: `apps/admin/src/features/products/products-page.tsx`
- Create: `apps/admin/src/features/categories/api.ts`

- [x] **Step 1: Write `features/categories/api.ts`**

```ts
import type { CategoryDTO } from '@bymariap/types';
import { api } from '@/lib/api';

export const categoriesApi = {
  list: () => api.get<CategoryDTO[]>('/admin/categories'),
  create: (data: { name: string; slug: string }) =>
    api.post<CategoryDTO>('/admin/categories', data),
  update: (id: string, data: { name?: string; slug?: string }) =>
    api.patch<CategoryDTO>(`/admin/categories/${id}`, data),
  remove: (id: string) => api.delete(`/admin/categories/${id}`),
};
```

- [x] **Step 2: Write `features/products/api.ts`**

```ts
import type { ProductDTO, ProductStatus } from '@bymariap/types';
import { api } from '@/lib/api';

export interface ProductInput {
  name: string;
  slug: string;
  description?: string;
  priceCop: number;
  stockQuantity: number;
  imageUrls: string[];
  categoryIds: string[];
  status: ProductStatus;
}

export const productsApi = {
  list: (params?: { status?: ProductStatus; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return api.get<ProductDTO[]>(`/admin/products${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api.get<ProductDTO>(`/admin/products/${id}`),
  create: (data: ProductInput) => api.post<ProductDTO>('/admin/products', data),
  update: (id: string, data: Partial<ProductInput>) =>
    api.patch<ProductDTO>(`/admin/products/${id}`, data),
  remove: (id: string) => api.delete(`/admin/products/${id}`),
};
```

- [x] **Step 3: Write `products-page.tsx`**

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { productsApi } from './api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCop } from '@/lib/utils';
import type { ProductStatus } from '@bymariap/types';

export function ProductsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>('');

  const list = useQuery({
    queryKey: ['products', { search, status }],
    queryFn: () => productsApi.list({ search: search || undefined, status: status || undefined }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => { toast.success('Producto eliminado'); qc.invalidateQueries({ queryKey: ['products'] }); },
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <Button onClick={() => nav('/products/new')}>Nuevo</Button>
      </header>

      <div className="flex gap-3">
        <Input placeholder="Buscarâ€¦" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={status} onChange={(e) => setStatus(e.target.value as any)} className="max-w-xs">
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="published">Publicado</option>
          <option value="archived">Archivado</option>
        </Select>
      </div>

      {list.isLoading && <p>Cargandoâ€¦</p>}
      {list.error && <p className="text-destructive">{(list.error as any).message}</p>}
      {list.data && (
        <Table>
          <THead>
            <TR>
              <TH>Nombre</TH><TH>Slug</TH><TH>Precio</TH><TH>Stock</TH><TH>Estado</TH><TH>CategorÃ­as</TH><TH></TH>
            </TR>
          </THead>
          <TBody>
            {list.data.map((p) => (
              <TR key={p.id}>
                <TD>{p.name}</TD>
                <TD className="text-muted-foreground">{p.slug}</TD>
                <TD>{formatCop(p.priceCop)}</TD>
                <TD>{p.stockQuantity}</TD>
                <TD><Badge>{p.status}</Badge></TD>
                <TD className="space-x-1">{p.categories.map((c) => <Badge key={c.id}>{c.name}</Badge>)}</TD>
                <TD className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => nav(`/products/${p.id}`)}>Editar</Button>
                  <Button size="sm" variant="destructive" onClick={() => confirm('Â¿Eliminar?') && remove.mutate(p.id)}>Eliminar</Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
```

- [x] **Step 4: Commit**

```bash
git add apps/admin/src/features
git commit -m "feat(admin): products list page + categories/products api clients"
```

---

## Task 18: Products feature â€” create/edit form page

**Files:**
- Create: `apps/admin/src/features/products/product-form-page.tsx`

- [x] **Step 1: Write `product-form-page.tsx`**

```tsx
import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { productsApi } from './api';
import { categoriesApi } from '@/features/categories/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

const schema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'kebab-case'),
  description: z.string().max(5000).optional(),
  priceCop: z.coerce.number().int().min(0),
  stockQuantity: z.coerce.number().int().min(0),
  imageUrls: z.array(z.object({ value: z.string().url() })).max(10),
  categoryIds: z.array(z.string()).default([]),
  status: z.enum(['draft', 'published', 'archived']),
});
type FormValues = z.infer<typeof schema>;

export function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const nav = useNavigate();
  const qc = useQueryClient();

  const cats = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const prod = useQuery({
    queryKey: ['products', id],
    queryFn: () => productsApi.get(id!),
    enabled: isEdit,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', slug: '', description: '', priceCop: 0, stockQuantity: 0,
      imageUrls: [], categoryIds: [], status: 'draft',
    },
  });
  const imgs = useFieldArray({ control: form.control, name: 'imageUrls' });

  useEffect(() => {
    if (prod.data) {
      form.reset({
        name: prod.data.name,
        slug: prod.data.slug,
        description: prod.data.description ?? '',
        priceCop: prod.data.priceCop,
        stockQuantity: prod.data.stockQuantity,
        imageUrls: prod.data.imageUrls.map((value) => ({ value })),
        categoryIds: prod.data.categories.map((c) => c.id),
        status: prod.data.status,
      });
    }
  }, [prod.data, form]);

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = { ...values, imageUrls: values.imageUrls.map((v) => v.value) };
      return isEdit ? productsApi.update(id!, payload) : productsApi.create(payload);
    },
    onSuccess: () => {
      toast.success('Guardado');
      qc.invalidateQueries({ queryKey: ['products'] });
      nav('/products');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error al guardar'),
  });

  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">{isEdit ? 'Editar producto' : 'Nuevo producto'}</h1>

      <Field label="Nombre" error={form.formState.errors.name?.message}>
        <Input {...form.register('name')} />
      </Field>
      <Field label="Slug" error={form.formState.errors.slug?.message}>
        <Input {...form.register('slug')} />
      </Field>
      <Field label="DescripciÃ³n">
        <Textarea {...form.register('description')} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Precio (COP)" error={form.formState.errors.priceCop?.message}>
          <Input type="number" min={0} {...form.register('priceCop')} />
        </Field>
        <Field label="Stock" error={form.formState.errors.stockQuantity?.message}>
          <Input type="number" min={0} {...form.register('stockQuantity')} />
        </Field>
      </div>

      <Field label="Estado">
        <Select {...form.register('status')}>
          <option value="draft">Borrador</option>
          <option value="published">Publicado</option>
          <option value="archived">Archivado</option>
        </Select>
      </Field>

      <Field label="CategorÃ­as">
        <div className="flex flex-wrap gap-2">
          {cats.data?.map((c) => {
            const checked = form.watch('categoryIds').includes(c.id);
            return (
              <label key={c.id} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const cur = form.getValues('categoryIds');
                    form.setValue('categoryIds', e.target.checked ? [...cur, c.id] : cur.filter((x) => x !== c.id));
                  }}
                />
                {c.name}
              </label>
            );
          })}
        </div>
      </Field>

      <Field label="ImÃ¡genes (URLs)">
        <div className="space-y-2">
          {imgs.fields.map((f, i) => (
            <div key={f.id} className="flex gap-2">
              <Input {...form.register(`imageUrls.${i}.value`)} placeholder="https://â€¦" />
              <Button type="button" variant="outline" onClick={() => imgs.remove(i)}>Ã—</Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => imgs.append({ value: '' })}>
            + URL
          </Button>
        </div>
      </Field>

      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>Guardar</Button>
        <Button type="button" variant="outline" onClick={() => nav('/products')}>Cancelar</Button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
```

- [x] **Step 2: Commit**

```bash
git add apps/admin/src/features/products
git commit -m "feat(admin): product create/edit form with image URLs + categories"
```

---

## Task 19: Categories feature page

**Files:**
- Create: `apps/admin/src/features/categories/categories-page.tsx`
- Create: `apps/admin/src/features/categories/category-form-dialog.tsx`

- [x] **Step 1: Write `category-form-dialog.tsx`**

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { categoriesApi } from './api';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { CategoryDTO } from '@bymariap/types';

const schema = z.object({
  name: z.string().min(2).max(60),
  slug: z.string().regex(/^[a-z0-9-]+$/),
});
type FormValues = z.infer<typeof schema>;

export function CategoryFormDialog({
  open, onOpenChange, editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: CategoryDTO | null;
}) {
  const qc = useQueryClient();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', slug: '' } });

  useEffect(() => {
    form.reset(editing ? { name: editing.name, slug: editing.slug } : { name: '', slug: '' });
  }, [editing, form]);

  const save = useMutation({
    mutationFn: (v: FormValues) => (editing ? categoriesApi.update(editing.id, v) : categoriesApi.create(v)),
    onSuccess: () => {
      toast.success('Guardado');
      qc.invalidateQueries({ queryKey: ['categories'] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={editing ? 'Editar categorÃ­a' : 'Nueva categorÃ­a'}>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-3">
        <div className="space-y-1">
          <Label>Nombre</Label>
          <Input {...form.register('name')} />
        </div>
        <div className="space-y-1">
          <Label>Slug</Label>
          <Input {...form.register('slug')} />
        </div>
        <Button type="submit" disabled={save.isPending}>Guardar</Button>
      </form>
    </Dialog>
  );
}
```

- [x] **Step 2: Write `categories-page.tsx`**

```tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { categoriesApi } from './api';
import { CategoryFormDialog } from './category-form-dialog';
import { Button } from '@/components/ui/button';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import type { CategoryDTO } from '@bymariap/types';

export function CategoriesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CategoryDTO | null>(null);
  const [open, setOpen] = useState(false);

  const list = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const remove = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => { toast.success('Eliminada'); qc.invalidateQueries({ queryKey: ['categories'] }); },
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  });

  return (
    <div className="space-y-4">
      <header className="flex justify-between">
        <h1 className="text-2xl font-semibold">CategorÃ­as</h1>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>Nueva</Button>
      </header>
      {list.data && (
        <Table>
          <THead><TR><TH>Nombre</TH><TH>Slug</TH><TH></TH></TR></THead>
          <TBody>
            {list.data.map((c) => (
              <TR key={c.id}>
                <TD>{c.name}</TD>
                <TD className="text-muted-foreground">{c.slug}</TD>
                <TD className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(c); setOpen(true); }}>Editar</Button>
                  <Button size="sm" variant="destructive" onClick={() => confirm('Â¿Eliminar?') && remove.mutate(c.id)}>Eliminar</Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <CategoryFormDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}
```

- [x] **Step 3: Commit**

```bash
git add apps/admin/src/features/categories
git commit -m "feat(admin): categories CRUD page"
```

---

## Task 20: Users feature page

**Files:**
- Create: `apps/admin/src/features/users/api.ts`
- Create: `apps/admin/src/features/users/users-page.tsx`
- Create: `apps/admin/src/features/users/user-form-dialog.tsx`

- [x] **Step 1: Write `features/users/api.ts`**

```ts
import { api } from '@/lib/api';

export interface UserRow {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roleId: string;
  role: { id: string; name: string };
}

export interface UserCreateInput {
  email: string; password: string; fullName: string; phone?: string; roleId: string;
}
export interface UserUpdateInput {
  fullName?: string; phone?: string; roleId?: string;
}

export const usersApi = {
  list: () => api.get<UserRow[]>('/admin/users'),
  get: (id: string) => api.get<UserRow>(`/admin/users/${id}`),
  create: (data: UserCreateInput) => api.post<UserRow>('/admin/users', data),
  update: (id: string, data: UserUpdateInput) => api.patch<UserRow>(`/admin/users/${id}`, data),
  remove: (id: string) => api.delete(`/admin/users/${id}`),
};

export interface RoleRow { id: string; name: string; description: string | null; permissions: string[]; }
export const rolesApi = {
  list: () => api.get<RoleRow[]>('/admin/rbac/roles'),
};
```

- [x] **Step 2: Write `user-form-dialog.tsx`**

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersApi, rolesApi, UserRow } from './api';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  roleId: z.string().min(1),
});
const updateSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().optional(),
  roleId: z.string().min(1),
});

export function UserFormDialog({
  open, onOpenChange, editing,
}: { open: boolean; onOpenChange: (o: boolean) => void; editing: UserRow | null }) {
  const qc = useQueryClient();
  const roles = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
  const isEdit = Boolean(editing);

  const form = useForm<any>({
    resolver: zodResolver(isEdit ? updateSchema : createSchema),
  });

  useEffect(() => {
    if (editing) form.reset({ fullName: editing.fullName, phone: editing.phone ?? '', roleId: editing.roleId });
    else form.reset({ email: '', password: '', fullName: '', phone: '', roleId: '' });
  }, [editing, form]);

  const save = useMutation({
    mutationFn: (v: any) => isEdit ? usersApi.update(editing!.id, v) : usersApi.create(v),
    onSuccess: () => { toast.success('Guardado'); qc.invalidateQueries({ queryKey: ['users'] }); onOpenChange(false); },
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-3">
        {!isEdit && (
          <>
            <div className="space-y-1"><Label>Email</Label><Input type="email" {...form.register('email')} /></div>
            <div className="space-y-1"><Label>ContraseÃ±a</Label><Input type="password" {...form.register('password')} /></div>
          </>
        )}
        <div className="space-y-1"><Label>Nombre completo</Label><Input {...form.register('fullName')} /></div>
        <div className="space-y-1"><Label>TelÃ©fono</Label><Input {...form.register('phone')} /></div>
        <div className="space-y-1">
          <Label>Rol</Label>
          <Select {...form.register('roleId')}>
            <option value="">â€”</option>
            {roles.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </div>
        <Button type="submit" disabled={save.isPending}>Guardar</Button>
      </form>
    </Dialog>
  );
}
```

- [x] **Step 3: Write `users-page.tsx`**

```tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersApi, UserRow } from './api';
import { UserFormDialog } from './user-form-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

export function UsersPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [open, setOpen] = useState(false);

  const list = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const remove = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => { toast.success('Eliminado'); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  });

  return (
    <div className="space-y-4">
      <header className="flex justify-between">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>Nuevo</Button>
      </header>
      {list.data && (
        <Table>
          <THead><TR><TH>Nombre</TH><TH>Email</TH><TH>Rol</TH><TH></TH></TR></THead>
          <TBody>
            {list.data.map((u) => (
              <TR key={u.id}>
                <TD>{u.fullName}</TD>
                <TD className="text-muted-foreground">{u.email}</TD>
                <TD><Badge>{u.role.name}</Badge></TD>
                <TD className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(u); setOpen(true); }}>Editar</Button>
                  <Button size="sm" variant="destructive" onClick={() => confirm('Â¿Eliminar?') && remove.mutate(u.id)}>Eliminar</Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <UserFormDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}
```

- [x] **Step 4: Commit**

```bash
git add apps/admin/src/features/users
git commit -m "feat(admin): users admin page with create/edit/delete"
```

---

## Task 21: Specialists feature page

**Files:**
- Create: `apps/admin/src/features/specialists/api.ts`
- Create: `apps/admin/src/features/specialists/specialists-page.tsx`
- Create: `apps/admin/src/features/specialists/specialist-form-dialog.tsx`

- [x] **Step 1: Write `api.ts`**

```ts
import { api } from '@/lib/api';

export interface SpecialistRow {
  id: string;
  userId: string;
  bio: string | null;
  specialties: string[];
  avatarUrl: string | null;
  user: { id: string; fullName: string; email: string };
}

export interface SpecialistInput {
  bio?: string;
  specialties?: string[];
  avatarUrl?: string;
}

export const specialistsApi = {
  list: () => api.get<SpecialistRow[]>('/admin/specialists'),
  upsert: (userId: string, data: SpecialistInput) =>
    api.put<SpecialistRow>(`/admin/specialists/${userId}`, data),
  remove: (userId: string) => api.delete(`/admin/specialists/${userId}`),
};
```

- [x] **Step 2: Write `specialist-form-dialog.tsx`**

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { specialistsApi, SpecialistRow } from './api';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface FormValues { userId: string; bio: string; specialties: string; avatarUrl: string; }

export function SpecialistFormDialog({
  open, onOpenChange, editing,
}: { open: boolean; onOpenChange: (o: boolean) => void; editing: SpecialistRow | null }) {
  const qc = useQueryClient();
  const form = useForm<FormValues>({ defaultValues: { userId: '', bio: '', specialties: '', avatarUrl: '' } });

  useEffect(() => {
    if (editing) form.reset({
      userId: editing.userId, bio: editing.bio ?? '',
      specialties: editing.specialties.join(', '),
      avatarUrl: editing.avatarUrl ?? '',
    });
    else form.reset({ userId: '', bio: '', specialties: '', avatarUrl: '' });
  }, [editing, form]);

  const save = useMutation({
    mutationFn: (v: FormValues) => specialistsApi.upsert(v.userId, {
      bio: v.bio || undefined,
      specialties: v.specialties ? v.specialties.split(',').map((s) => s.trim()).filter(Boolean) : [],
      avatarUrl: v.avatarUrl || undefined,
    }),
    onSuccess: () => { toast.success('Guardado'); qc.invalidateQueries({ queryKey: ['specialists'] }); onOpenChange(false); },
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={editing ? 'Editar especialista' : 'Asignar perfil'}>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-3">
        <div className="space-y-1">
          <Label>User ID (debe tener rol "specialist")</Label>
          <Input {...form.register('userId')} disabled={Boolean(editing)} />
        </div>
        <div className="space-y-1"><Label>Bio</Label><Textarea {...form.register('bio')} /></div>
        <div className="space-y-1">
          <Label>Especialidades (separadas por coma)</Label>
          <Input {...form.register('specialties')} />
        </div>
        <div className="space-y-1"><Label>Avatar URL</Label><Input {...form.register('avatarUrl')} /></div>
        <Button type="submit" disabled={save.isPending}>Guardar</Button>
      </form>
    </Dialog>
  );
}
```

- [x] **Step 3: Write `specialists-page.tsx`**

```tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { specialistsApi, SpecialistRow } from './api';
import { SpecialistFormDialog } from './specialist-form-dialog';
import { Button } from '@/components/ui/button';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

export function SpecialistsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<SpecialistRow | null>(null);
  const [open, setOpen] = useState(false);

  const list = useQuery({ queryKey: ['specialists'], queryFn: specialistsApi.list });
  const remove = useMutation({
    mutationFn: (userId: string) => specialistsApi.remove(userId),
    onSuccess: () => { toast.success('Eliminado'); qc.invalidateQueries({ queryKey: ['specialists'] }); },
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  });

  return (
    <div className="space-y-4">
      <header className="flex justify-between">
        <h1 className="text-2xl font-semibold">Especialistas</h1>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>Asignar</Button>
      </header>
      {list.data && (
        <Table>
          <THead><TR><TH>Nombre</TH><TH>Email</TH><TH>Especialidades</TH><TH></TH></TR></THead>
          <TBody>
            {list.data.map((s) => (
              <TR key={s.id}>
                <TD>{s.user.fullName}</TD>
                <TD className="text-muted-foreground">{s.user.email}</TD>
                <TD>{s.specialties.join(', ')}</TD>
                <TD className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(s); setOpen(true); }}>Editar</Button>
                  <Button size="sm" variant="destructive" onClick={() => confirm('Â¿Quitar perfil?') && remove.mutate(s.userId)}>Quitar</Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <SpecialistFormDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}
```

- [x] **Step 4: Commit**

```bash
git add apps/admin/src/features/specialists
git commit -m "feat(admin): specialists assignment page"
```

---

## Task 22: Build the admin + manual smoke test

**Files:** none new â€” verification step

- [x] **Step 1: Typecheck + build admin**

Run:
```bash
pnpm --filter @bymariap/admin typecheck
pnpm --filter @bymariap/admin build
```

Expected: green. If TS errors appear, fix them inline (most likely missing imports or zod type narrowing).

- [ ] **Step 2: Start API + admin together, manual smoke** *(pendiente — requiere browser)*

In one terminal:
```bash
pnpm --filter @bymariap/api dev
```
In another:
```bash
pnpm --filter @bymariap/admin dev
```

Then in the browser:
1. Open http://localhost:5173 â†’ redirect to `/login`.
2. Login with seeded admin (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).
3. Land on `/products` â€” list renders (with demo data if you ran `SEED_DEMO_DATA=true`).
4. Create new product â†’ save â†’ appears in list.
5. Edit product â†’ change name â†’ save â†’ reflected in list.
6. Delete product â†’ confirm â†’ gone.
7. Categories tab â†’ create / edit / delete a category.
8. Users tab â†’ create a new `specialist` user â†’ save.
9. Specialists tab â†’ "Asignar" â†’ paste the new user's id â†’ save â†’ appears in list.
10. Logout â†’ redirected to `/login`, cookies cleared.

Note any defects and fix before committing the final task. Common issues:
- CORS error â†’ check `ADMIN_ORIGIN` env on API matches admin port.
- 401 loop â†’ verify `credentials: 'include'` on fetch and `secure: false` on cookies in dev.

- [ ] **Step 3: No commit needed unless fixes made**

If fixes were applied during smoke, commit them:
```bash
git add -p
git commit -m "fix(admin|api): smoke test fixes"
```

---

## Task 23: README updates + acceptance verification

**Files:**
- Modify: `README.md`

- [x] **Step 1: Update root `README.md`**

Append a Phase 2 section:

```markdown
## Phase 2 â€” Admin + Products

Two apps, two ports:
- API: http://localhost:3001 (`pnpm --filter @bymariap/api dev`)
- Admin: http://localhost:5173 (`pnpm --filter @bymariap/admin dev`)

Set `ADMIN_ORIGIN=http://localhost:5173` in `apps/api/.env` and `VITE_API_BASE_URL=http://localhost:3001` in `apps/admin/.env`.

Seed with demo data:
```bash
SEED_DEMO_DATA=true pnpm --filter @bymariap/api prisma:seed
```
```

- [x] **Step 2: Run full Phase 2 verification suite**

Run:
```bash
pnpm --filter @bymariap/api typecheck
pnpm --filter @bymariap/api test
pnpm --filter @bymariap/api build
pnpm --filter @bymariap/admin typecheck
pnpm --filter @bymariap/admin build
```

Expected: all green.

- [x] **Step 3: Final commit**

```bash
git add README.md
git commit -m "docs: phase 2 admin + products setup"
```

---

## Acceptance criteria (Phase 2)

API:
- `GET /store/products` returns only `published` products to anyone (public, no auth).
- `GET /store/products/:slug` returns the single product or 404.
- `GET /store/categories` returns all categories (public).
- `GET /admin/products` returns all statuses with `products:read` permission.
- `POST /admin/products` creates a product with categories linked atomically.
- `PATCH /admin/products/:id` replaces categories when `categoryIds` is sent; leaves them untouched otherwise.
- `DELETE /admin/products/:id` cascades the `ProductCategory` rows.
- `POST/PATCH /admin/categories` rejects duplicate slug with 409.
- `PUT /admin/specialists/:userId` rejects with 400 if user's role is not `specialist`.
- CORS lets the admin (http://localhost:5173) call any endpoint with cookies.
- Unit suite for new modules green (specialists, categories, products).

Admin:
- `/login` authenticates against the API and lands on `/products`.
- Logout invalidates cookies and bounces back to `/login`.
- Protected routes redirect unauthenticated visitors to `/login`.
- Products list shows demo data with status badges and category chips, supports search + status filter.
- Product form creates and edits products including category multi-select and image URL list.
- Categories page supports create / edit / delete in a dialog.
- Users page supports create / edit / delete with role assignment.
- Specialists page lists assigned specialists and supports upsert / remove.
- All admin pages typecheck and build with `pnpm --filter @bymariap/admin build`.

## Out of scope (deferred to later phases)

- Cart, Orders, Payments, Wompi â€” Phase 3
- Storefront (Next.js) â€” Phase 4
- Services, Availability, Appointments â€” Phase 5
- ClientRecord encryption + Consent + audit logs â€” Phase 6
- Analytics dashboards + production deploy â€” Phase 7
- Image upload to object storage (admin pastes URLs for now)
- Bulk product import / export
- Audit log of admin actions
- Playwright E2E
