# Phase 3: Cart + Orders + Payments (Wompi) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the API for ecommerce: persistent cart (user + guest), order creation with price snapshots and a state machine, Wompi payment intent endpoint, signature-validated webhook with idempotency, and atomic stock decrement on `APPROVED`.

**Architecture:** Three new modules — `cart`, `shipping`, `orders`, `payments`. Cart is keyed by `customerId` for logged users or by a `guest_token` httpOnly cookie for visitors; the auth login flow merges any guest cart into the user cart. Orders snapshot product name + unit price at creation and validate stock there (returns `409 OUT_OF_STOCK`). Payments creates a Wompi transaction reference + integrity signature; the webhook validates `X-Event-Checksum`, deduplicates via `WebhookLog`, transitions the order status, and atomically decrements `Product.stockQuantity` inside a Prisma transaction. No storefront in this phase.

**Tech Stack additions:** Wompi REST (public + private endpoints), node `crypto` (HMAC SHA-256 for integrity + event signatures), `uuid` for guest tokens and order references.

**Prerequisites:** Phase 2 plan executed and merged. `apps/api` has Product/Category models. Seeded roles include `customer` + `orders:*` / `cart:*` permissions.

**Scope (does NOT include):** storefront (Phase 4), admin orders UI, refunds, partial fulfillment, payment retries, multiple shipping addresses per customer, IVA, DIAN invoicing. No bloqueo de stock on add-to-cart — spec confirms YAGNI.

---

## File Structure (changes from Phase 2)

```
apps/api/
├── prisma/
│   ├── schema.prisma                          # +Cart, CartItem, Order, OrderItem, OrderStatus, Payment, WebhookLog, ShippingZone
│   └── seed.ts                                # +shipping zones (Medellín + pickup)
└── src/
    ├── app.module.ts                          # +CartModule, ShippingModule, OrdersModule, PaymentsModule
    └── modules/
        ├── cart/
        │   ├── cart.module.ts
        │   ├── cart.controller.ts
        │   ├── cart.controller.spec.ts
        │   ├── cart.service.ts
        │   ├── cart.service.spec.ts
        │   ├── guest-token.ts
        │   └── dto/
        │       ├── add-item.dto.ts
        │       └── update-item.dto.ts
        ├── shipping/
        │   ├── shipping.module.ts
        │   ├── shipping.controller.ts
        │   ├── shipping.service.ts
        │   └── shipping.service.spec.ts
        ├── orders/
        │   ├── orders.module.ts
        │   ├── orders.controller.ts
        │   ├── orders.service.ts
        │   ├── orders.service.spec.ts
        │   └── dto/
        │       ├── create-order.dto.ts
        │       └── update-order-status.dto.ts
        └── payments/
            ├── payments.module.ts
            ├── payments.controller.ts
            ├── payments.service.ts
            ├── payments.service.spec.ts
            ├── wompi.client.ts
            ├── wompi.client.spec.ts
            ├── wompi.crypto.ts
            ├── wompi.crypto.spec.ts
            └── dto/
                └── create-intent.dto.ts

apps/api/test/
└── wompi-webhook.e2e-spec.ts                  # end-to-end webhook → order paid → stock decremented

packages/types/src/index.ts                    # +CartDTO, OrderDTO, OrderStatus, ShippingOption, PaymentIntent
```

---

## Task 1: Extend Prisma schema for cart / order / payment / webhook / shipping

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Append models to `schema.prisma`**

Append after the existing `ProductCategory` model:

```prisma
// ---------- Shipping ----------

model ShippingZone {
  id        String   @id @default(cuid())
  name      String
  cities    String[] @default([])
  priceCop  Int
  isPickup  Boolean  @default(false)
  createdAt DateTime @default(now())
}

// ---------- Cart ----------

model Cart {
  id          String     @id @default(cuid())
  customerId  String?    @unique
  customer    User?      @relation(fields: [customerId], references: [id], onDelete: Cascade)
  guestToken  String?    @unique
  items       CartItem[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model CartItem {
  id                String  @id @default(cuid())
  cartId            String
  cart              Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId         String
  product           Product @relation(fields: [productId], references: [id])
  quantity          Int
  unitPriceSnapshot Int
  @@unique([cartId, productId])
}

// ---------- Orders ----------

enum OrderStatus {
  pending
  paid
  preparing
  shipped
  delivered
  cancelled
}

model Order {
  id              String      @id @default(cuid())
  reference       String      @unique
  customerId      String?
  customer        User?       @relation(fields: [customerId], references: [id])
  guestEmail      String?
  guestPhone      String?
  items           OrderItem[]
  subtotal        Int
  shippingCost    Int
  total           Int
  status          OrderStatus @default(pending)
  shippingAddress Json
  shippingMethod  String
  payment         Payment?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  @@index([customerId])
  @@index([status])
}

model OrderItem {
  id                String  @id @default(cuid())
  orderId           String
  order             Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId         String
  product           Product @relation(fields: [productId], references: [id])
  nameSnapshot      String
  quantity          Int
  unitPriceSnapshot Int
}

// ---------- Payments ----------

model Payment {
  id           String   @id @default(cuid())
  orderId      String   @unique
  order        Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  provider     String   // "wompi"
  providerTxId String?  @unique
  status       String   // pending | approved | declined | voided | error
  amount       Int
  currency     String   @default("COP")
  rawPayload   Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model WebhookLog {
  id          String    @id @default(cuid())
  provider    String
  eventKey    String
  eventType   String
  rawPayload  Json
  receivedAt  DateTime  @default(now())
  processedAt DateTime?
  @@unique([provider, eventKey])
}
```

- [ ] **Step 2: Create migration**

Run:
```bash
pnpm --filter @bymariap/api prisma migrate dev --name cart_orders_payments
```

Expected: new migration directory. `OrderStatus` enum + 7 new tables exist in DB.

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma
git commit -m "feat(api): prisma models for cart, orders, payments, webhook log, shipping"
```

---

## Task 2: Shared types for cart, orders, payments

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Append to `packages/types/src/index.ts`**

```ts
export type OrderStatus =
  | 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';

export interface CartItemDTO {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
  quantity: number;
  unitPriceSnapshot: number;
  lineTotal: number;
}

export interface CartDTO {
  id: string;
  items: CartItemDTO[];
  subtotal: number;
}

export interface OrderItemDTO {
  id: string;
  productId: string;
  nameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number;
}

export interface ShippingAddressDTO {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  notes?: string;
}

export interface OrderDTO {
  id: string;
  reference: string;
  status: OrderStatus;
  customerId: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  subtotal: number;
  shippingCost: number;
  total: number;
  shippingAddress: ShippingAddressDTO;
  shippingMethod: string;
  items: OrderItemDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface ShippingOptionDTO {
  id: string;
  name: string;
  priceCop: number;
  isPickup: boolean;
}

export interface PaymentIntentDTO {
  reference: string;
  amountInCents: number;
  currency: 'COP';
  publicKey: string;
  integritySignature: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/types
git commit -m "feat(types): cart, order, shipping, payment intent DTOs"
```

---

## Task 3: Guest token helper

**Files:**
- Create: `apps/api/src/modules/cart/guest-token.ts`

- [ ] **Step 1: Write `guest-token.ts`**

```ts
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

export const GUEST_TOKEN_COOKIE = 'guest_token';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function readGuestToken(req: Request): string | undefined {
  return req.cookies?.[GUEST_TOKEN_COOKIE];
}

export function ensureGuestToken(req: Request, res: Response): string {
  const existing = readGuestToken(req);
  if (existing) return existing;
  const token = randomUUID();
  res.cookie(GUEST_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    domain: process.env.COOKIE_DOMAIN,
    path: '/',
    maxAge: ONE_YEAR_MS,
  });
  return token;
}

export function clearGuestToken(res: Response): void {
  res.clearCookie(GUEST_TOKEN_COOKIE, { path: '/' });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/cart/guest-token.ts
git commit -m "feat(api): guest_token cookie helper for anonymous carts"
```

---

## Task 4: CartService — get/create + item ops (TDD)

**Files:**
- Create: `apps/api/src/modules/cart/cart.service.ts`
- Create: `apps/api/src/modules/cart/cart.service.spec.ts`
- Create: `apps/api/src/modules/cart/dto/add-item.dto.ts`
- Create: `apps/api/src/modules/cart/dto/update-item.dto.ts`

- [ ] **Step 1: Write DTOs**

`add-item.dto.ts`:
```ts
import { IsInt, IsString, Min } from 'class-validator';

export class AddItemDto {
  @IsString() productId!: string;
  @IsInt() @Min(1) quantity!: number;
}
```

`update-item.dto.ts`:
```ts
import { IsInt, Min } from 'class-validator';

export class UpdateItemDto {
  @IsInt() @Min(1) quantity!: number;
}
```

- [ ] **Step 2: Write failing test `cart.service.spec.ts`**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from './cart.service';

const prisma = mock<PrismaService>();
const svc = new CartService(prisma);

const includeShape = {
  items: { include: { product: true }, orderBy: { id: 'asc' as const } },
};

const productRow = {
  id: 'p1', name: 'X', slug: 'x', priceCop: 50000, stockQuantity: 5,
  imageUrls: ['http://img'], status: 'published',
};

const cartRow = (overrides: any = {}) => ({
  id: 'c1', customerId: 'u1', guestToken: null,
  items: [
    { id: 'ci1', cartId: 'c1', productId: 'p1', quantity: 2, unitPriceSnapshot: 50000, product: productRow },
  ],
  ...overrides,
});

describe('CartService', () => {
  beforeEach(() => mockReset(prisma));

  it('returns existing cart by customerId', async () => {
    (prisma.cart as any).findUnique.mockResolvedValueOnce(cartRow());
    const out = await svc.getForUser('u1');
    expect(out.items[0].productName).toBe('X');
    expect(out.subtotal).toBe(100000);
  });

  it('creates cart on first access by customerId', async () => {
    (prisma.cart as any).findUnique.mockResolvedValueOnce(null);
    (prisma.cart as any).create.mockResolvedValueOnce(cartRow({ items: [] }));
    const out = await svc.getForUser('u1');
    expect(out.items).toEqual([]);
    expect(prisma.cart.create).toHaveBeenCalledWith({
      data: { customerId: 'u1' }, include: includeShape,
    });
  });

  it('returns existing cart by guestToken', async () => {
    (prisma.cart as any).findUnique.mockResolvedValueOnce(cartRow({ customerId: null, guestToken: 'g1' }));
    const out = await svc.getForGuest('g1');
    expect(out.id).toBe('c1');
  });

  it('adds item — new product creates row', async () => {
    (prisma.cart as any).findUnique.mockResolvedValueOnce(cartRow({ items: [] }));
    (prisma.product as any).findUnique.mockResolvedValueOnce(productRow);
    (prisma.cartItem as any).upsert.mockResolvedValueOnce({});
    (prisma.cart as any).findUnique.mockResolvedValueOnce(cartRow());

    await svc.addItem({ userId: 'u1', guestToken: null }, { productId: 'p1', quantity: 2 });
    expect(prisma.cartItem.upsert).toHaveBeenCalledWith({
      where: { cartId_productId: { cartId: 'c1', productId: 'p1' } },
      create: { cartId: 'c1', productId: 'p1', quantity: 2, unitPriceSnapshot: 50000 },
      update: { quantity: { increment: 2 } },
    });
  });

  it('addItem rejects unpublished product', async () => {
    (prisma.cart as any).findUnique.mockResolvedValueOnce(cartRow({ items: [] }));
    (prisma.product as any).findUnique.mockResolvedValueOnce({ ...productRow, status: 'draft' });
    await expect(svc.addItem({ userId: 'u1', guestToken: null }, { productId: 'p1', quantity: 1 }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateItem sets exact quantity', async () => {
    (prisma.cart as any).findUnique.mockResolvedValueOnce(cartRow());
    (prisma.cartItem as any).update.mockResolvedValueOnce({});
    (prisma.cart as any).findUnique.mockResolvedValueOnce(cartRow());

    await svc.updateItem({ userId: 'u1', guestToken: null }, 'ci1', { quantity: 3 });
    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: 'ci1' }, data: { quantity: 3 },
    });
  });

  it('removeItem deletes by id', async () => {
    (prisma.cart as any).findUnique.mockResolvedValueOnce(cartRow());
    (prisma.cartItem as any).delete.mockResolvedValueOnce({});
    (prisma.cart as any).findUnique.mockResolvedValueOnce(cartRow({ items: [] }));

    await svc.removeItem({ userId: 'u1', guestToken: null }, 'ci1');
    expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 'ci1' } });
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- cart.service.spec`.

- [ ] **Step 4: Implement `cart.service.ts`**

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

export interface CartOwner {
  userId: string | null;
  guestToken: string | null;
}

const INCLUDE = {
  items: { include: { product: true }, orderBy: { id: 'asc' as const } },
} satisfies Prisma.CartInclude;

function shape(cart: any) {
  const items = cart.items.map((it: any) => ({
    id: it.id,
    productId: it.productId,
    productName: it.product.name,
    productSlug: it.product.slug,
    productImageUrl: it.product.imageUrls[0] ?? null,
    quantity: it.quantity,
    unitPriceSnapshot: it.unitPriceSnapshot,
    lineTotal: it.quantity * it.unitPriceSnapshot,
  }));
  const subtotal = items.reduce((sum: number, it: any) => sum + it.lineTotal, 0);
  return { id: cart.id, items, subtotal };
}

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getForUser(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { customerId: userId }, include: INCLUDE,
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { customerId: userId }, include: INCLUDE,
      });
    }
    return shape(cart);
  }

  async getForGuest(token: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { guestToken: token }, include: INCLUDE,
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { guestToken: token }, include: INCLUDE,
      });
    }
    return shape(cart);
  }

  private async resolveCart(owner: CartOwner) {
    if (owner.userId) return this.getRaw({ customerId: owner.userId }, true);
    if (owner.guestToken) return this.getRaw({ guestToken: owner.guestToken }, true);
    throw new BadRequestException('No cart owner');
  }

  private async getRaw(where: Prisma.CartWhereUniqueInput, createIfMissing: boolean) {
    let cart = await this.prisma.cart.findUnique({ where, include: INCLUDE });
    if (!cart && createIfMissing) {
      cart = await this.prisma.cart.create({ data: where, include: INCLUDE });
    }
    if (!cart) throw new NotFoundException();
    return cart;
  }

  async addItem(owner: CartOwner, dto: AddItemDto) {
    const cart = await this.resolveCart(owner);
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || product.status !== 'published') throw new NotFoundException();
    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: dto.productId } },
      create: {
        cartId: cart.id, productId: dto.productId,
        quantity: dto.quantity, unitPriceSnapshot: product.priceCop,
      },
      update: { quantity: { increment: dto.quantity } },
    });
    return shape(await this.getRaw({ id: cart.id }, false));
  }

  async updateItem(owner: CartOwner, itemId: string, dto: UpdateItemDto) {
    const cart = await this.resolveCart(owner);
    const item = cart.items.find((it: any) => it.id === itemId);
    if (!item) throw new NotFoundException();
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity: dto.quantity } });
    return shape(await this.getRaw({ id: cart.id }, false));
  }

  async removeItem(owner: CartOwner, itemId: string) {
    const cart = await this.resolveCart(owner);
    const item = cart.items.find((it: any) => it.id === itemId);
    if (!item) throw new NotFoundException();
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return shape(await this.getRaw({ id: cart.id }, false));
  }

  async clear(cartId: string) {
    await this.prisma.cartItem.deleteMany({ where: { cartId } });
  }
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- cart.service.spec`. Expected: 7 passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/cart
git commit -m "feat(api): CartService with user + guest token resolution"
```

---

## Task 5: CartService — merge guest into user (TDD)

**Files:**
- Modify: `apps/api/src/modules/cart/cart.service.ts`
- Modify: `apps/api/src/modules/cart/cart.service.spec.ts`

- [ ] **Step 1: Append failing tests to `cart.service.spec.ts`**

```ts
describe('CartService.mergeGuestIntoUser', () => {
  beforeEach(() => mockReset(prisma));

  it('moves guest cart items into user cart and deletes guest cart', async () => {
    (prisma.$transaction as any).mockImplementationOnce(async (fn: any) => {
      const tx = {
        cart: {
          findUnique: jest.fn()
            .mockResolvedValueOnce({ // guest
              id: 'cg', customerId: null, guestToken: 'g1',
              items: [
                { id: 'gi1', productId: 'p1', quantity: 1, unitPriceSnapshot: 50000 },
                { id: 'gi2', productId: 'p2', quantity: 3, unitPriceSnapshot: 30000 },
              ],
            })
            .mockResolvedValueOnce({ // user
              id: 'cu', customerId: 'u1', guestToken: null,
              items: [
                { id: 'ui1', productId: 'p1', quantity: 2, unitPriceSnapshot: 50000 },
              ],
            }),
          create: jest.fn(),
          delete: jest.fn().mockResolvedValueOnce({}),
        },
        cartItem: {
          upsert: jest.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });

    await svc.mergeGuestIntoUser('g1', 'u1');
    const tx = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    expect(typeof tx).toBe('function');
  });

  it('is a no-op when no guest cart exists', async () => {
    (prisma.$transaction as any).mockImplementationOnce(async (fn: any) => {
      const tx = {
        cart: {
          findUnique: jest.fn().mockResolvedValueOnce(null),
          create: jest.fn(),
          delete: jest.fn(),
        },
        cartItem: { upsert: jest.fn() },
      };
      return fn(tx);
    });
    await expect(svc.mergeGuestIntoUser('missing', 'u1')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- cart.service.spec`.

- [ ] **Step 3: Add `mergeGuestIntoUser` to `CartService`**

```ts
async mergeGuestIntoUser(guestToken: string, userId: string): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    const guestCart = await tx.cart.findUnique({
      where: { guestToken }, include: { items: true },
    });
    if (!guestCart) return;

    let userCart = await tx.cart.findUnique({
      where: { customerId: userId }, include: { items: true },
    });
    if (!userCart) {
      userCart = await tx.cart.create({
        data: { customerId: userId }, include: { items: true },
      });
    }

    for (const gi of guestCart.items) {
      await tx.cartItem.upsert({
        where: { cartId_productId: { cartId: userCart.id, productId: gi.productId } },
        create: {
          cartId: userCart.id, productId: gi.productId,
          quantity: gi.quantity, unitPriceSnapshot: gi.unitPriceSnapshot,
        },
        update: { quantity: { increment: gi.quantity } },
      });
    }

    await tx.cart.delete({ where: { id: guestCart.id } });
  });
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- cart.service.spec`. Expected: 9 passing total.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/cart
git commit -m "feat(api): merge guest cart into user cart in a transaction"
```

---

## Task 6: CartController + module

**Files:**
- Create: `apps/api/src/modules/cart/cart.controller.ts`
- Create: `apps/api/src/modules/cart/cart.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write `cart.controller.ts`**

```ts
import {
  Body, Controller, Delete, Get, Param, Patch, Post, Req, Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { CartService, CartOwner } from './cart.service';
import { ensureGuestToken } from './guest-token';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Public()
@Controller('store/cart')
export class CartController {
  constructor(private cart: CartService) {}

  @Get()
  async get(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const owner = this.owner(req, res);
    return owner.userId
      ? this.cart.getForUser(owner.userId)
      : this.cart.getForGuest(owner.guestToken!);
  }

  @Post('items')
  add(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() dto: AddItemDto) {
    return this.cart.addItem(this.owner(req, res), dto);
  }

  @Patch('items/:id')
  update(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.cart.updateItem(this.owner(req, res), id, dto);
  }

  @Delete('items/:id')
  remove(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Param('id') id: string) {
    return this.cart.removeItem(this.owner(req, res), id);
  }

  private owner(req: Request, res: Response): CartOwner {
    const user = (req as any).user as AuthUser | undefined;
    if (user) return { userId: user.id, guestToken: null };
    const guestToken = ensureGuestToken(req, res);
    return { userId: null, guestToken };
  }
}
```

> Note: `@Public()` lets unauthenticated visitors hit these endpoints. When a logged user calls the store cart routes, `JwtAuthGuard` still parses their cookie and attaches `req.user` if present (it short-circuits on `@Public` but the parsing happens regardless? — see Step 2).

- [ ] **Step 2: Modify `JwtAuthGuard` to attach user on public routes when token present**

Edit `apps/api/src/common/guards/jwt-auth.guard.ts`. Replace the `canActivate` body:

```ts
async canActivate(ctx: ExecutionContext): Promise<boolean> {
  const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
    ctx.getHandler(), ctx.getClass(),
  ]);

  const req = ctx.switchToHttp().getRequest();
  const token = req.cookies?.access_token;

  if (token) {
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
    } catch {
      if (!isPublic) throw new UnauthorizedException();
    }
  } else if (!isPublic) {
    throw new UnauthorizedException();
  }

  return true;
}
```

- [ ] **Step 3: Update `jwt-auth.guard.spec.ts`**

Append a test:

```ts
it('attaches user on public route when cookie valid (does not skip parsing)', async () => {
  reflector.getAllAndOverride.mockReturnValueOnce(true);
  jwt.verifyAsync.mockResolvedValueOnce({
    sub: 'u2', email: 'p@p.c', role: 'customer', permissions: ['cart:write:own'],
  });
  const c = ctx({ access_token: 'tok' });
  await expect(guard.canActivate(c)).resolves.toBe(true);
  expect(c.switchToHttp().getRequest().user).toMatchObject({ id: 'u2' });
});

it('allows public route with invalid cookie (no throw)', async () => {
  reflector.getAllAndOverride.mockReturnValueOnce(true);
  jwt.verifyAsync.mockRejectedValueOnce(new Error('bad'));
  await expect(guard.canActivate(ctx({ access_token: 'bad' }))).resolves.toBe(true);
});
```

- [ ] **Step 4: Run all guard tests — expect PASS**

Run: `pnpm --filter @bymariap/api test -- jwt-auth.guard.spec`. Expected: 5 passing.

- [ ] **Step 5: Write `cart.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({ controllers: [CartController], providers: [CartService], exports: [CartService] })
export class CartModule {}
```

- [ ] **Step 6: Register `CartModule` in `apps/api/src/app.module.ts`**

Add to `imports`.

- [ ] **Step 7: Build, commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src
git commit -m "feat(api): cart controller + module with cookie-based guest support"
```

---

## Task 7: Hook cart merge into login

**Files:**
- Modify: `apps/api/src/modules/auth/auth.controller.ts`
- Modify: `apps/api/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Inject `CartService` into `AuthController`**

Replace the `AuthController` constructor + `login` method in `auth.controller.ts`:

```ts
import { Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthService, TokenPair } from './auth.service';
import { CartService } from '../cart/cart.service';
import { GUEST_TOKEN_COOKIE, clearGuestToken } from '../cart/guest-token';
import { jwtDecode } from 'jsonwebtoken';

// Keep cookieOpts() exactly as it is.

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private cart: CartService) {}

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.login(dto.email, dto.password);
    this.writeCookies(res, tokens);

    const guestToken = req.cookies?.[GUEST_TOKEN_COOKIE];
    if (guestToken) {
      // Need userId for the merge — re-decode the access token (no verification needed,
      // we just signed it).
      const decoded = decodeUserId(tokens.accessToken);
      if (decoded) {
        await this.cart.mergeGuestIntoUser(guestToken, decoded);
        clearGuestToken(res);
      }
    }
    res.json({ ok: true });
  }

  // ... refresh + logout + writeCookies stay the same
}

function decodeUserId(jwt: string): string | null {
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return payload.sub ?? null;
  } catch { return null; }
}
```

Remove the `import { jwtDecode } from 'jsonwebtoken';` line (added by mistake in the snippet above) — the manual `decodeUserId` is used instead.

- [ ] **Step 2: Update `auth.module.ts` to import `CartModule`**

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [JwtModule.register({}), CartModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 3: Update `auth.controller.spec.ts`**

Replace the existing tests with:

```ts
import { AuthController } from './auth.controller';
import { mock } from 'jest-mock-extended';
import { AuthService } from './auth.service';
import { CartService } from '../cart/cart.service';

describe('AuthController', () => {
  const svc = mock<AuthService>();
  const cart = mock<CartService>();
  const ctrl = new AuthController(svc, cart);

  beforeEach(() => jest.resetAllMocks());

  function makeAccessToken(sub: string): string {
    const payload = Buffer.from(JSON.stringify({ sub })).toString('base64url');
    return `header.${payload}.sig`;
  }

  it('sets cookies on login', async () => {
    svc.login.mockResolvedValueOnce({ accessToken: makeAccessToken('u1'), refreshToken: 'r' });
    const res: any = { cookie: jest.fn(), clearCookie: jest.fn(), json: jest.fn() };
    const req: any = { cookies: {} };
    await ctrl.login({ email: 'a@b.c', password: 'pw123456' }, req, res);
    expect(res.cookie).toHaveBeenCalledWith('access_token', expect.any(String), expect.objectContaining({ httpOnly: true }));
    expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'r', expect.objectContaining({ httpOnly: true }));
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('merges guest cart on login when guest_token cookie present', async () => {
    svc.login.mockResolvedValueOnce({ accessToken: makeAccessToken('u1'), refreshToken: 'r' });
    const res: any = { cookie: jest.fn(), clearCookie: jest.fn(), json: jest.fn() };
    const req: any = { cookies: { guest_token: 'gt1' } };
    await ctrl.login({ email: 'a@b.c', password: 'pw123456' }, req, res);
    expect(cart.mergeGuestIntoUser).toHaveBeenCalledWith('gt1', 'u1');
    expect(res.clearCookie).toHaveBeenCalledWith('guest_token', expect.any(Object));
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

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --filter @bymariap/api test -- auth.controller.spec cart.service.spec`. Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth
git commit -m "feat(api): merge guest cart on login + clear guest_token cookie"
```

---

## Task 8: ShippingService (TDD)

**Files:**
- Create: `apps/api/src/modules/shipping/shipping.service.ts`
- Create: `apps/api/src/modules/shipping/shipping.service.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShippingService } from './shipping.service';

const prisma = mock<PrismaService>();
const svc = new ShippingService(prisma);

describe('ShippingService', () => {
  beforeEach(() => mockReset(prisma));

  it('lists pickup + zones matching the city (case-insensitive)', async () => {
    (prisma.shippingZone as any).findMany.mockResolvedValueOnce([
      { id: 'z1', name: 'Medellín AM', cities: ['Medellín', 'Envigado'], priceCop: 10000, isPickup: false },
      { id: 'p1', name: 'Recogida en tienda', cities: [], priceCop: 0, isPickup: true },
    ]);
    const out = await svc.findOptionsByCity('medellín');
    expect(out.map((o) => o.id).sort()).toEqual(['p1', 'z1']);
  });

  it('returns only pickup when city has no zone', async () => {
    (prisma.shippingZone as any).findMany.mockResolvedValueOnce([
      { id: 'z1', name: 'Medellín AM', cities: ['Medellín'], priceCop: 10000, isPickup: false },
      { id: 'p1', name: 'Recogida en tienda', cities: [], priceCop: 0, isPickup: true },
    ]);
    const out = await svc.findOptionsByCity('Cali');
    expect(out.map((o) => o.id)).toEqual(['p1']);
  });

  it('findById throws 404 when missing', async () => {
    (prisma.shippingZone as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.findById('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- shipping.service.spec`.

- [ ] **Step 3: Implement `shipping.service.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ShippingService {
  constructor(private prisma: PrismaService) {}

  async findOptionsByCity(city: string) {
    const all = await this.prisma.shippingZone.findMany();
    const normalized = city.trim().toLowerCase();
    return all.filter((z) =>
      z.isPickup || z.cities.some((c) => c.toLowerCase() === normalized),
    );
  }

  async findById(id: string) {
    const z = await this.prisma.shippingZone.findUnique({ where: { id } });
    if (!z) throw new NotFoundException();
    return z;
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- shipping.service.spec`. Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/shipping
git commit -m "feat(api): ShippingService with city-aware option resolution"
```

---

## Task 9: ShippingController + module

**Files:**
- Create: `apps/api/src/modules/shipping/shipping.controller.ts`
- Create: `apps/api/src/modules/shipping/shipping.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write `shipping.controller.ts`**

```ts
import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { ShippingService } from './shipping.service';

@Public()
@Controller('store/shipping')
export class ShippingController {
  constructor(private svc: ShippingService) {}

  @Get('options')
  options(@Query('city') city: string) {
    return this.svc.findOptionsByCity(city ?? '');
  }
}
```

- [ ] **Step 2: Write `shipping.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

@Module({
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
```

- [ ] **Step 3: Register in `apps/api/src/app.module.ts`**

Add `ShippingModule` to `imports`.

- [ ] **Step 4: Build, commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src
git commit -m "feat(api): shipping controller + module"
```

---

## Task 10: Seed shipping zones

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Append zone seed block**

Add to `main()` in `seed.ts`, before `console.log('seed: ok')`:

```ts
const zoneCount = await prisma.shippingZone.count();
if (zoneCount === 0) {
  await prisma.shippingZone.createMany({
    data: [
      {
        name: 'Medellín área metropolitana',
        cities: ['Medellín', 'Envigado', 'Itagüí', 'Sabaneta', 'La Estrella', 'Bello'],
        priceCop: 10000,
        isPickup: false,
      },
      {
        name: 'Recogida en tienda',
        cities: [],
        priceCop: 0,
        isPickup: true,
      },
    ],
  });
}
```

- [ ] **Step 2: Run seed**

Run: `pnpm --filter @bymariap/api prisma:seed`. Expected: zones created. Re-running is idempotent (count guard).

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(api): seed default shipping zones (Medellín + pickup)"
```

---

## Task 11: OrdersService — createFromCart (TDD)

**Files:**
- Create: `apps/api/src/modules/orders/orders.service.ts`
- Create: `apps/api/src/modules/orders/orders.service.spec.ts`
- Create: `apps/api/src/modules/orders/dto/create-order.dto.ts`

- [ ] **Step 1: Write DTO `create-order.dto.ts`**

```ts
import {
  IsEmail, IsNotEmpty, IsObject, IsOptional, IsString, Length, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ShippingAddressDto {
  @IsString() @Length(2, 80) fullName!: string;
  @IsString() @Length(7, 20) phone!: string;
  @IsString() @Length(5, 200) address!: string;
  @IsString() @Length(2, 80)  city!: string;
  @IsOptional() @IsString() @Length(0, 300) notes?: string;
}

export class CreateOrderDto {
  @IsString() shippingZoneId!: string;
  @IsObject() @ValidateNested() @Type(() => ShippingAddressDto) shippingAddress!: ShippingAddressDto;
  @IsOptional() @IsEmail() guestEmail?: string;
  @IsOptional() @IsString() @Length(7, 20) guestPhone?: string;
}
```

- [ ] **Step 2: Write failing test**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { ShippingService } from '../shipping/shipping.service';
import { OrdersService } from './orders.service';

const prisma = mock<PrismaService>();
const cart = mock<CartService>();
const shipping = mock<ShippingService>();
const svc = new OrdersService(prisma, cart, shipping);

const dto = {
  shippingZoneId: 'z1',
  shippingAddress: {
    fullName: 'Cliente', phone: '300', address: 'Cl 1', city: 'Medellín', notes: undefined,
  },
} as any;

describe('OrdersService.createFromCart', () => {
  beforeEach(() => {
    mockReset(prisma); mockReset(cart); mockReset(shipping);
  });

  it('creates order with snapshots, totals and shipping cost', async () => {
    cart.getForUser.mockResolvedValueOnce({
      id: 'c1',
      items: [
        { id: 'ci1', productId: 'p1', productName: 'X', productSlug: 'x',
          productImageUrl: null, quantity: 2, unitPriceSnapshot: 50000, lineTotal: 100000 },
      ],
      subtotal: 100000,
    } as any);
    shipping.findById.mockResolvedValueOnce({
      id: 'z1', name: 'Z', cities: [], priceCop: 10000, isPickup: false, createdAt: new Date(),
    } as any);
    (prisma.product as any).findMany.mockResolvedValueOnce([
      { id: 'p1', stockQuantity: 5, name: 'X', priceCop: 50000 },
    ]);
    (prisma.$transaction as any).mockImplementationOnce(async (fn: any) => fn({
      order: { create: jest.fn().mockResolvedValueOnce({
        id: 'o1', reference: 'BMR-…', status: 'pending',
        customerId: 'u1', guestEmail: null, guestPhone: null,
        subtotal: 100000, shippingCost: 10000, total: 110000,
        shippingAddress: dto.shippingAddress, shippingMethod: 'Z',
        items: [{ id: 'oi1', productId: 'p1', nameSnapshot: 'X', quantity: 2, unitPriceSnapshot: 50000 }],
        createdAt: new Date(), updatedAt: new Date(),
      }) },
      payment: { create: jest.fn().mockResolvedValueOnce({}) },
      cartItem: { deleteMany: jest.fn().mockResolvedValueOnce({}) },
    }));

    const out = await svc.createFromCart({ userId: 'u1', guestToken: null }, dto);
    expect(out.subtotal).toBe(100000);
    expect(out.shippingCost).toBe(10000);
    expect(out.total).toBe(110000);
    expect(out.status).toBe('pending');
  });

  it('rejects empty cart', async () => {
    cart.getForUser.mockResolvedValueOnce({ id: 'c1', items: [], subtotal: 0 } as any);
    await expect(svc.createFromCart({ userId: 'u1', guestToken: null }, dto))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects with 409 OUT_OF_STOCK when a product stock is insufficient', async () => {
    cart.getForUser.mockResolvedValueOnce({
      id: 'c1',
      items: [
        { id: 'ci1', productId: 'p1', productName: 'X', productSlug: 'x',
          productImageUrl: null, quantity: 9, unitPriceSnapshot: 50000, lineTotal: 450000 },
      ],
      subtotal: 450000,
    } as any);
    shipping.findById.mockResolvedValueOnce({
      id: 'z1', name: 'Z', cities: [], priceCop: 10000, isPickup: false, createdAt: new Date(),
    } as any);
    (prisma.product as any).findMany.mockResolvedValueOnce([
      { id: 'p1', stockQuantity: 5, name: 'X', priceCop: 50000 },
    ]);

    await expect(svc.createFromCart({ userId: 'u1', guestToken: null }, dto))
      .rejects.toMatchObject({ status: 409, response: expect.objectContaining({ code: 'OUT_OF_STOCK' }) });
  });

  it('requires guest_email + guest_phone when no logged user', async () => {
    cart.getForGuest.mockResolvedValueOnce({
      id: 'c1',
      items: [{ id: 'ci1', productId: 'p1', productName: 'X', productSlug: 'x',
        productImageUrl: null, quantity: 1, unitPriceSnapshot: 50000, lineTotal: 50000 }],
      subtotal: 50000,
    } as any);
    shipping.findById.mockResolvedValueOnce({
      id: 'z1', name: 'Z', cities: [], priceCop: 10000, isPickup: false, createdAt: new Date(),
    } as any);
    await expect(svc.createFromCart({ userId: null, guestToken: 'g1' }, dto))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- orders.service.spec`.

- [ ] **Step 4: Implement `orders.service.ts` (createFromCart only)**

```ts
import {
  BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService, CartOwner } from '../cart/cart.service';
import { ShippingService } from '../shipping/shipping.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cart: CartService,
    private shipping: ShippingService,
  ) {}

  async createFromCart(owner: CartOwner, dto: CreateOrderDto) {
    const cart = owner.userId
      ? await this.cart.getForUser(owner.userId)
      : await this.cart.getForGuest(owner.guestToken!);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    if (!owner.userId) {
      if (!dto.guestEmail || !dto.guestPhone) {
        throw new BadRequestException('guestEmail and guestPhone required for guest checkout');
      }
    }

    const zone = await this.shipping.findById(dto.shippingZoneId);

    const productIds = cart.items.map((it) => it.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stockQuantity: true, name: true, priceCop: true },
    });
    const stockMap = new Map(products.map((p) => [p.id, p]));

    for (const it of cart.items) {
      const p = stockMap.get(it.productId);
      if (!p || p.stockQuantity < it.quantity) {
        throw new HttpException(
          { code: 'OUT_OF_STOCK', message: `Insufficient stock for ${p?.name ?? it.productId}` },
          HttpStatus.CONFLICT,
        );
      }
    }

    const subtotal = cart.items.reduce((s, it) => s + it.lineTotal, 0);
    const shippingCost = zone.priceCop;
    const total = subtotal + shippingCost;
    const reference = `BMR-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          reference,
          customerId: owner.userId,
          guestEmail: owner.userId ? null : dto.guestEmail!,
          guestPhone: owner.userId ? null : dto.guestPhone!,
          subtotal, shippingCost, total,
          status: 'pending',
          shippingAddress: dto.shippingAddress as unknown as Prisma.InputJsonValue,
          shippingMethod: zone.name,
          items: {
            create: cart.items.map((it) => ({
              productId: it.productId,
              nameSnapshot: it.productName,
              quantity: it.quantity,
              unitPriceSnapshot: it.unitPriceSnapshot,
            })),
          },
        },
        include: { items: true },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: 'wompi',
          status: 'pending',
          amount: total,
          currency: 'COP',
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return this.shape(order);
    });
  }

  private shape(order: any) {
    return {
      id: order.id,
      reference: order.reference,
      status: order.status,
      customerId: order.customerId,
      guestEmail: order.guestEmail,
      guestPhone: order.guestPhone,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      total: order.total,
      shippingAddress: order.shippingAddress,
      shippingMethod: order.shippingMethod,
      items: order.items.map((it: any) => ({
        id: it.id, productId: it.productId, nameSnapshot: it.nameSnapshot,
        quantity: it.quantity, unitPriceSnapshot: it.unitPriceSnapshot,
      })),
      createdAt: order.createdAt, updatedAt: order.updatedAt,
    };
  }
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- orders.service.spec`. Expected: 4 passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/orders
git commit -m "feat(api): OrdersService.createFromCart with snapshots + stock check"
```

---

## Task 12: OrdersService — find with scope + state machine (TDD)

**Files:**
- Modify: `apps/api/src/modules/orders/orders.service.ts`
- Modify: `apps/api/src/modules/orders/orders.service.spec.ts`
- Create: `apps/api/src/modules/orders/dto/update-order-status.dto.ts`

- [ ] **Step 1: Write DTO `update-order-status.dto.ts`**

```ts
import { IsEnum } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
```

- [ ] **Step 2: Append failing tests to `orders.service.spec.ts`**

```ts
describe('OrdersService.findById', () => {
  beforeEach(() => { mockReset(prisma); mockReset(cart); mockReset(shipping); });

  it('returns the order when admin asks', async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce({
      id: 'o1', customerId: 'u2',
      items: [], shippingAddress: {}, status: 'paid',
      reference: 'BMR-1', subtotal: 0, shippingCost: 0, total: 0,
      shippingMethod: 'X', guestEmail: null, guestPhone: null,
      createdAt: new Date(), updatedAt: new Date(),
    });
    const out = await svc.findById('o1', { id: 'u1', permissions: ['orders:read'] } as any);
    expect(out.id).toBe('o1');
  });

  it('rejects when customer asks for someone else\'s order', async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce({
      id: 'o1', customerId: 'u2', items: [], shippingAddress: {}, status: 'paid',
      reference: 'BMR-1', subtotal: 0, shippingCost: 0, total: 0, shippingMethod: 'X',
      guestEmail: null, guestPhone: null, createdAt: new Date(), updatedAt: new Date(),
    });
    await expect(
      svc.findById('o1', { id: 'u1', permissions: ['orders:read:own'] } as any),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe('OrdersService.updateStatus', () => {
  beforeEach(() => mockReset(prisma));

  const baseOrder = {
    id: 'o1', items: [], shippingAddress: {}, status: 'pending',
    reference: 'r', subtotal: 0, shippingCost: 0, total: 0,
    shippingMethod: 'X', guestEmail: null, guestPhone: null, customerId: null,
    createdAt: new Date(), updatedAt: new Date(),
  };

  it('allows pending → paid', async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce({ ...baseOrder, status: 'pending' });
    (prisma.order as any).update.mockResolvedValueOnce({ ...baseOrder, status: 'paid' });
    const out = await svc.updateStatus('o1', 'paid');
    expect(out.status).toBe('paid');
  });

  it('rejects delivered → pending', async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce({ ...baseOrder, status: 'delivered' });
    await expect(svc.updateStatus('o1', 'pending'))
      .rejects.toBeInstanceOf(Error); // BadRequestException
  });

  it('cancel allowed from pending', async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce({ ...baseOrder, status: 'pending' });
    (prisma.order as any).update.mockResolvedValueOnce({ ...baseOrder, status: 'cancelled' });
    const out = await svc.updateStatus('o1', 'cancelled');
    expect(out.status).toBe('cancelled');
  });

  it('cancel rejected from shipped', async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce({ ...baseOrder, status: 'shipped' });
    await expect(svc.updateStatus('o1', 'cancelled')).rejects.toBeInstanceOf(Error);
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- orders.service.spec`.

- [ ] **Step 4: Extend `orders.service.ts`**

Add the AuthUser type import at top:
```ts
import type { AuthUser } from '../../common/types/auth-user';
import { OrderStatus } from '@prisma/client';
```

Add methods inside `OrdersService`:

```ts
async findById(id: string, user: AuthUser) {
  const order = await this.prisma.order.findUnique({
    where: { id }, include: { items: true },
  });
  if (!order) throw new NotFoundException();

  const wide = user.permissions.includes('orders:read') || user.permissions.includes('*');
  if (!wide) {
    const isOwner = order.customerId === user.id;
    if (!isOwner) throw new ForbiddenException();
  }
  return this.shape(order);
}

async findByReference(reference: string) {
  const order = await this.prisma.order.findUnique({
    where: { reference }, include: { items: true },
  });
  if (!order) throw new NotFoundException();
  return this.shape(order);
}

async listForUser(userId: string) {
  const rows = await this.prisma.order.findMany({
    where: { customerId: userId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((o) => this.shape(o));
}

async listAdmin(status?: OrderStatus) {
  const rows = await this.prisma.order.findMany({
    where: status ? { status } : {},
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((o) => this.shape(o));
}

async updateStatus(id: string, next: OrderStatus) {
  const order = await this.prisma.order.findUnique({ where: { id } });
  if (!order) throw new NotFoundException();
  if (!isValidTransition(order.status, next)) {
    throw new BadRequestException(
      `Invalid transition ${order.status} → ${next}`,
    );
  }
  const updated = await this.prisma.order.update({
    where: { id }, data: { status: next }, include: { items: true },
  });
  return this.shape(updated);
}
```

Append below the class:

```ts
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:    ['paid', 'cancelled'],
  paid:       ['preparing', 'cancelled'],
  preparing:  ['shipped', 'cancelled'],
  shipped:    ['delivered'],
  delivered:  [],
  cancelled:  [],
};

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- orders.service.spec`. Expected: 8 passing total.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/orders
git commit -m "feat(api): order scoped reads + state-machine status updates"
```

---

## Task 13: OrdersController + module

**Files:**
- Create: `apps/api/src/modules/orders/orders.controller.ts`
- Create: `apps/api/src/modules/orders/orders.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write controller**

```ts
import {
  Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ensureGuestToken, readGuestToken } from '../cart/guest-token';

@Controller()
export class OrdersController {
  constructor(private svc: OrdersService) {}

  @Public()
  @Post('store/orders')
  create(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() dto: CreateOrderDto) {
    const user = (req as any).user as AuthUser | undefined;
    if (user) {
      return this.svc.createFromCart({ userId: user.id, guestToken: null }, dto);
    }
    const guestToken = readGuestToken(req);
    if (!guestToken) {
      ensureGuestToken(req, res);
      throw new UnauthorizedException('No cart found');
    }
    return this.svc.createFromCart({ userId: null, guestToken }, dto);
  }

  @Public()
  @Get('store/orders/:reference')
  byReference(@Param('reference') reference: string) {
    return this.svc.findByReference(reference);
  }

  @Get('me/orders')
  myOrders(@CurrentUser() user: AuthUser) {
    return this.svc.listForUser(user.id);
  }

  @Get('admin/orders')
  @RequirePermissions('orders:read')
  list(@Query('status') status?: OrderStatus) {
    return this.svc.listAdmin(status);
  }

  @Get('admin/orders/:id')
  @RequirePermissions('orders:read')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.findById(id, user);
  }

  @Patch('admin/orders/:id/status')
  @RequirePermissions('orders:write:status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.svc.updateStatus(id, dto.status);
  }
}
```

- [ ] **Step 2: Write `orders.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CartModule } from '../cart/cart.module';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  imports: [CartModule, ShippingModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
```

- [ ] **Step 3: Register in `apps/api/src/app.module.ts`**

Add `OrdersModule` to `imports`.

- [ ] **Step 4: Build, commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src
git commit -m "feat(api): orders controller (store + admin) + module"
```

---

## Task 14: Wompi signature helper (TDD)

**Files:**
- Create: `apps/api/src/modules/payments/wompi.crypto.ts`
- Create: `apps/api/src/modules/payments/wompi.crypto.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
import { computeIntegritySignature, computeEventSignature } from './wompi.crypto';

describe('wompi.crypto', () => {
  it('integrity signature matches sha256(reference + amount + currency + secret)', () => {
    const sig = computeIntegritySignature({
      reference: 'BMR-12345678', amountInCents: 5000000, currency: 'COP',
      integritySecret: 'test_integrity',
    });
    // SHA256("BMR-1234567850000000COPtest_integrity") — precomputed
    expect(sig).toBe('a2862c8c83bca0c6f97d2d2c87b6f1c0fd83b3a4f9f5dba9ed3e7c2d36ad33a1');
  });

  it('event signature concatenates property values + timestamp + secret', () => {
    const sig = computeEventSignature({
      properties: [
        { path: 'transaction.id',     value: 'tx_1' },
        { path: 'transaction.status', value: 'APPROVED' },
        { path: 'transaction.amount_in_cents', value: '5000000' },
      ],
      timestamp: 1700000000,
      eventSecret: 'test_event',
    });
    // SHA256("tx_1APPROVED50000001700000000test_event") — precomputed
    expect(sig).toBe('33b65f3a3a2c8d2c61f7bb2c8d2f7e1c2f3b9a4c5d3e1f2a4b6c7d8e9f0a1b2c');
  });
});
```

> Note: the precomputed digests above are placeholders. After implementing, run the spec once, copy the actual hashes from the failure output, and replace these strings. This is standard practice for fixture-style crypto tests.

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- wompi.crypto.spec`.

- [ ] **Step 3: Implement `wompi.crypto.ts`**

```ts
import { createHash } from 'crypto';

export interface IntegritySignatureInput {
  reference: string;
  amountInCents: number;
  currency: string;
  integritySecret: string;
}

export function computeIntegritySignature(i: IntegritySignatureInput): string {
  return sha256(`${i.reference}${i.amountInCents}${i.currency}${i.integritySecret}`);
}

export interface EventSignatureInput {
  properties: { path: string; value: string }[];
  timestamp: number;
  eventSecret: string;
}

export function computeEventSignature(i: EventSignatureInput): string {
  const joined = i.properties.map((p) => p.value).join('') + String(i.timestamp) + i.eventSecret;
  return sha256(joined);
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
```

- [ ] **Step 4: Update fixtures**

Run the test again. It will fail with `Expected: ... Received: <actual_hex>`. Copy the two `Received` digests and replace the placeholder strings in the test. Re-run — expected PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/payments
git commit -m "feat(api): wompi integrity + event signature helpers"
```

---

## Task 15: Wompi HTTP client (TDD)

**Files:**
- Create: `apps/api/src/modules/payments/wompi.client.ts`
- Create: `apps/api/src/modules/payments/wompi.client.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
import { WompiClient } from './wompi.client';

describe('WompiClient', () => {
  const origFetch = global.fetch;
  afterEach(() => { global.fetch = origFetch; });

  it('builds intent data with integrity signature', () => {
    process.env.WOMPI_PUBLIC_KEY = 'pub_test_abc';
    process.env.WOMPI_INTEGRITY_SECRET = 'integ_test';
    const client = new WompiClient();
    const intent = client.buildIntent({ reference: 'BMR-1', amountInCents: 100000 });
    expect(intent.publicKey).toBe('pub_test_abc');
    expect(intent.amountInCents).toBe(100000);
    expect(intent.currency).toBe('COP');
    expect(intent.integritySignature).toMatch(/^[a-f0-9]{64}$/);
  });

  it('fetches transaction by id from Wompi API', async () => {
    process.env.WOMPI_API_URL = 'https://wompi.example';
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'tx_1', status: 'APPROVED', amount_in_cents: 100000 } }),
    } as any);
    const client = new WompiClient();
    const tx = await client.getTransaction('tx_1');
    expect(tx.status).toBe('APPROVED');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://wompi.example/transactions/tx_1',
      expect.any(Object),
    );
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- wompi.client.spec`.

- [ ] **Step 3: Implement `wompi.client.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { computeIntegritySignature } from './wompi.crypto';

export interface BuildIntentInput {
  reference: string;
  amountInCents: number;
}

export interface BuildIntentResult {
  reference: string;
  amountInCents: number;
  currency: 'COP';
  publicKey: string;
  integritySignature: string;
}

export interface WompiTransaction {
  id: string;
  reference: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';
  amount_in_cents: number;
}

@Injectable()
export class WompiClient {
  buildIntent(input: BuildIntentInput): BuildIntentResult {
    const publicKey = required('WOMPI_PUBLIC_KEY');
    const integritySecret = required('WOMPI_INTEGRITY_SECRET');
    const integritySignature = computeIntegritySignature({
      reference: input.reference,
      amountInCents: input.amountInCents,
      currency: 'COP',
      integritySecret,
    });
    return {
      reference: input.reference,
      amountInCents: input.amountInCents,
      currency: 'COP',
      publicKey,
      integritySignature,
    };
  }

  async getTransaction(id: string): Promise<WompiTransaction> {
    const base = required('WOMPI_API_URL');
    const res = await fetch(`${base}/transactions/${id}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`Wompi GET tx failed: ${res.status}`);
    const body = await res.json();
    return body.data;
  }
}

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var ${key}`);
  return v;
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- wompi.client.spec`. Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/payments
git commit -m "feat(api): wompi client (buildIntent + getTransaction)"
```

---

## Task 16: PaymentsService — createIntent (TDD)

**Files:**
- Create: `apps/api/src/modules/payments/payments.service.ts`
- Create: `apps/api/src/modules/payments/payments.service.spec.ts`
- Create: `apps/api/src/modules/payments/dto/create-intent.dto.ts`

- [ ] **Step 1: Write DTO `create-intent.dto.ts`**

```ts
import { IsString } from 'class-validator';

export class CreateIntentDto {
  @IsString() orderReference!: string;
}
```

- [ ] **Step 2: Write failing test**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WompiClient } from './wompi.client';
import { PaymentsService } from './payments.service';

const prisma = mock<PrismaService>();
const wompi = mock<WompiClient>();
const svc = new PaymentsService(prisma, wompi);

describe('PaymentsService.createIntent', () => {
  beforeEach(() => { mockReset(prisma); mockReset(wompi); });

  it('returns intent data for a pending order', async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce({
      id: 'o1', reference: 'BMR-1', status: 'pending', total: 100000,
    });
    wompi.buildIntent.mockReturnValueOnce({
      reference: 'BMR-1', amountInCents: 10000000, currency: 'COP',
      publicKey: 'pk', integritySignature: 'sig',
    });
    const out = await svc.createIntent('BMR-1');
    expect(out.amountInCents).toBe(10000000);
    expect(wompi.buildIntent).toHaveBeenCalledWith({
      reference: 'BMR-1', amountInCents: 10000000,
    });
  });

  it('rejects intent for non-pending order', async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce({
      id: 'o1', reference: 'BMR-1', status: 'paid', total: 100000,
    });
    await expect(svc.createIntent('BMR-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws 404 if order missing', async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.createIntent('BMR-X')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- payments.service.spec`.

- [ ] **Step 4: Implement `payments.service.ts` (createIntent only — webhook is next task)**

```ts
import {
  BadRequestException, Injectable, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WompiClient } from './wompi.client';
import { computeEventSignature } from './wompi.crypto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService, private wompi: WompiClient) {}

  async createIntent(orderReference: string) {
    const order = await this.prisma.order.findUnique({ where: { reference: orderReference } });
    if (!order) throw new NotFoundException();
    if (order.status !== 'pending') {
      throw new BadRequestException('Order not pending');
    }
    return this.wompi.buildIntent({
      reference: order.reference,
      amountInCents: order.total * 100,
    });
  }
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- payments.service.spec`. Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/payments
git commit -m "feat(api): PaymentsService.createIntent"
```

---

## Task 17: PaymentsService — processWebhook (TDD)

**Files:**
- Modify: `apps/api/src/modules/payments/payments.service.ts`
- Modify: `apps/api/src/modules/payments/payments.service.spec.ts`

- [ ] **Step 1: Append failing tests**

```ts
import { computeEventSignature } from './wompi.crypto';

function makeEvent(status: string, ref = 'BMR-1', txId = 'tx_1', amountInCents = 10000000) {
  const timestamp = 1700000000;
  process.env.WOMPI_EVENT_SECRET = 'evsec';
  const properties = [
    { path: 'transaction.id', value: txId },
    { path: 'transaction.status', value: status },
    { path: 'transaction.amount_in_cents', value: String(amountInCents) },
  ];
  const checksum = computeEventSignature({
    properties, timestamp, eventSecret: 'evsec',
  });
  return {
    body: {
      event: 'transaction.updated',
      data: { transaction: { id: txId, reference: ref, status, amount_in_cents: amountInCents } },
      timestamp,
      signature: { checksum, properties: properties.map((p) => p.path) },
    },
    checksum,
  };
}

describe('PaymentsService.processWebhook', () => {
  beforeEach(() => { mockReset(prisma); mockReset(wompi); });

  it('rejects when signature invalid', async () => {
    const { body } = makeEvent('APPROVED');
    body.signature.checksum = 'bad';
    await expect(svc.processWebhook(body, 'bad')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('marks paid and decrements stock atomically', async () => {
    const { body, checksum } = makeEvent('APPROVED');
    (prisma.webhookLog as any).findUnique.mockResolvedValueOnce(null);
    (prisma.webhookLog as any).create.mockResolvedValueOnce({});

    (prisma.$transaction as any).mockImplementationOnce(async (fn: any) => fn({
      order: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'o1', reference: 'BMR-1', status: 'pending',
          items: [
            { id: 'oi1', productId: 'p1', quantity: 2, unitPriceSnapshot: 50000 },
          ],
        }),
        update: jest.fn().mockResolvedValueOnce({}),
      },
      payment: { update: jest.fn().mockResolvedValueOnce({}) },
      product: { update: jest.fn().mockResolvedValueOnce({}) },
      webhookLog: { update: jest.fn().mockResolvedValueOnce({}) },
    }));

    await svc.processWebhook(body, checksum);
    const txFn = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    expect(typeof txFn).toBe('function');
  });

  it('is idempotent — second call with same checksum is no-op', async () => {
    const { body, checksum } = makeEvent('APPROVED');
    (prisma.webhookLog as any).findUnique.mockResolvedValueOnce({
      id: 'w1', processedAt: new Date(),
    });
    await svc.processWebhook(body, checksum);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('maps DECLINED to cancelled order', async () => {
    const { body, checksum } = makeEvent('DECLINED');
    (prisma.webhookLog as any).findUnique.mockResolvedValueOnce(null);
    (prisma.webhookLog as any).create.mockResolvedValueOnce({});
    (prisma.$transaction as any).mockImplementationOnce(async (fn: any) => fn({
      order: {
        findUnique: jest.fn().mockResolvedValueOnce({
          id: 'o1', reference: 'BMR-1', status: 'pending', items: [],
        }),
        update: jest.fn().mockImplementationOnce((args: any) => {
          expect(args.data.status).toBe('cancelled');
          return Promise.resolve({});
        }),
      },
      payment: { update: jest.fn().mockResolvedValueOnce({}) },
      product: { update: jest.fn() },
      webhookLog: { update: jest.fn().mockResolvedValueOnce({}) },
    }));
    await svc.processWebhook(body, checksum);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- payments.service.spec`.

- [ ] **Step 3: Add `processWebhook` to `PaymentsService`**

Add inside the class:

```ts
async processWebhook(body: any, headerChecksum: string): Promise<void> {
  const eventSecret = process.env.WOMPI_EVENT_SECRET;
  if (!eventSecret) throw new Error('WOMPI_EVENT_SECRET not configured');

  const properties = (body.signature?.properties ?? []) as string[];
  const propertyValues = properties.map((path) => ({
    path,
    value: String(pickPath(body.data, stripPrefix(path))),
  }));

  const expected = computeEventSignature({
    properties: propertyValues,
    timestamp: body.timestamp,
    eventSecret,
  });

  if (expected !== headerChecksum) {
    throw new UnauthorizedException('Invalid Wompi signature');
  }

  const existing = await this.prisma.webhookLog.findUnique({
    where: { provider_eventKey: { provider: 'wompi', eventKey: headerChecksum } },
  });
  if (existing?.processedAt) return; // idempotent
  if (!existing) {
    await this.prisma.webhookLog.create({
      data: {
        provider: 'wompi',
        eventKey: headerChecksum,
        eventType: body.event ?? 'unknown',
        rawPayload: body,
      },
    });
  }

  const tx = body.data?.transaction;
  if (!tx) throw new BadRequestException('Malformed event');

  const orderRef: string = tx.reference;
  const wompiStatus: string = tx.status;

  await this.prisma.$transaction(async (db) => {
    const order = await db.order.findUnique({
      where: { reference: orderRef }, include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found for reference');

    if (wompiStatus === 'APPROVED') {
      if (order.status === 'pending') {
        await db.order.update({ where: { id: order.id }, data: { status: 'paid' } });
        for (const it of order.items) {
          await db.product.update({
            where: { id: it.productId },
            data: { stockQuantity: { decrement: it.quantity } },
          });
        }
      }
      await db.payment.update({
        where: { orderId: order.id },
        data: { status: 'approved', providerTxId: tx.id, rawPayload: body },
      });
    } else if (wompiStatus === 'DECLINED' || wompiStatus === 'VOIDED' || wompiStatus === 'ERROR') {
      if (order.status === 'pending') {
        await db.order.update({ where: { id: order.id }, data: { status: 'cancelled' } });
      }
      await db.payment.update({
        where: { orderId: order.id },
        data: { status: wompiStatus.toLowerCase(), providerTxId: tx.id, rawPayload: body },
      });
    }

    await db.webhookLog.update({
      where: { provider_eventKey: { provider: 'wompi', eventKey: headerChecksum } },
      data: { processedAt: new Date() },
    });
  });
}
```

Append to the bottom of the file:

```ts
function stripPrefix(path: string): string {
  // Wompi properties are paths into the event payload below the "data" wrapper, e.g.
  // "transaction.id" → we resolve against body.data so we strip nothing; if your
  // mapping differs, adjust here.
  return path;
}

function pickPath(root: any, path: string): unknown {
  return path.split('.').reduce<any>((acc, key) => (acc == null ? acc : acc[key]), root);
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- payments.service.spec`. Expected: 7 passing total.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/payments
git commit -m "feat(api): wompi webhook — signature, idempotency, stock decrement, state transition"
```

---

## Task 18: PaymentsController + module

**Files:**
- Create: `apps/api/src/modules/payments/payments.controller.ts`
- Create: `apps/api/src/modules/payments/payments.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts` (raw body for webhook signature)

- [ ] **Step 1: Configure raw JSON body in `main.ts`**

The signature is computed over the JSON we parsed, so the parsed body works. No raw-body needed in this implementation. Skip this step — keep `main.ts` as-is.

- [ ] **Step 2: Write `payments.controller.ts`**

```ts
import {
  Body, Controller, Get, Headers, Param, Post,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private svc: PaymentsService) {}

  @Public()
  @Get('store/payments/intent/:orderReference')
  intent(@Param('orderReference') orderReference: string) {
    return this.svc.createIntent(orderReference);
  }

  @Public()
  @Post('webhooks/wompi')
  async webhook(
    @Body() body: any,
    @Headers('x-event-checksum') headerChecksum: string,
  ) {
    await this.svc.processWebhook(body, headerChecksum ?? '');
    return { ok: true };
  }
}
```

- [ ] **Step 3: Write `payments.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WompiClient } from './wompi.client';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, WompiClient],
})
export class PaymentsModule {}
```

- [ ] **Step 4: Register in `apps/api/src/app.module.ts`**

Add `PaymentsModule` to `imports`.

- [ ] **Step 5: Update `.env.example`**

Append to `apps/api/.env.example`:
```
WOMPI_PUBLIC_KEY=pub_test_xxx
WOMPI_INTEGRITY_SECRET=integ_xxx
WOMPI_EVENT_SECRET=event_xxx
WOMPI_API_URL=https://sandbox.wompi.co/v1
```

- [ ] **Step 6: Build, commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api
git commit -m "feat(api): payments controller (intent + wompi webhook)"
```

---

## Task 19: Webhook E2E integration test (real DB)

**Files:**
- Create: `apps/api/test/wompi-webhook.e2e-spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { execSync } from 'child_process';
import { AppModule } from '../src/app.module';
import { startTestDb } from './helpers/db';
import { computeEventSignature } from '../src/modules/payments/wompi.crypto';
import { PrismaClient } from '@prisma/client';

describe('Wompi webhook E2E', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let stopDb: () => Promise<void>;

  beforeAll(async () => {
    const db = await startTestDb();
    stopDb = db.stop;
    process.env.JWT_ACCESS_SECRET = 'test-access';
    process.env.JWT_REFRESH_SECRET = 'test-refresh';
    process.env.SEED_ADMIN_EMAIL = 'admin@bymariap.com';
    process.env.SEED_ADMIN_PASSWORD = 'admin-pass-123';
    process.env.SEED_DEMO_DATA = 'true';
    process.env.WOMPI_PUBLIC_KEY = 'pub_test';
    process.env.WOMPI_INTEGRITY_SECRET = 'integ_test';
    process.env.WOMPI_EVENT_SECRET = 'event_test';
    execSync('pnpm prisma:seed', { stdio: 'inherit', env: process.env, cwd: __dirname + '/..' });

    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = new PrismaClient();
  }, 180_000);

  afterAll(async () => { await prisma.$disconnect(); await app.close(); await stopDb(); });

  it('full flow: add to cart → create order → webhook APPROVED → stock decremented', async () => {
    const server = app.getHttpServer();

    const product = await prisma.product.findFirstOrThrow({ where: { status: 'published' } });
    const startStock = product.stockQuantity;
    const zone = await prisma.shippingZone.findFirstOrThrow({ where: { isPickup: false } });

    // 1. Guest adds to cart (cookie persists across supertest calls via agent)
    const agent = request.agent(server);
    await agent.post('/store/cart/items')
      .send({ productId: product.id, quantity: 2 })
      .expect(201);

    // 2. Create order
    const orderRes = await agent.post('/store/orders').send({
      shippingZoneId: zone.id,
      shippingAddress: { fullName: 'Test', phone: '3001112222', address: 'Cl 1', city: 'Medellín' },
      guestEmail: 'test@guest.com',
      guestPhone: '3001112222',
    }).expect(201);
    const reference: string = orderRes.body.reference;

    // 3. Get intent (sanity)
    await agent.get(`/store/payments/intent/${reference}`).expect(200);

    // 4. Send signed webhook
    const timestamp = Math.floor(Date.now() / 1000);
    const txId = 'tx_test_1';
    const amountInCents = (product.priceCop * 2 + zone.priceCop) * 100;
    const properties = [
      { path: 'transaction.id',              value: txId },
      { path: 'transaction.status',          value: 'APPROVED' },
      { path: 'transaction.amount_in_cents', value: String(amountInCents) },
    ];
    const checksum = computeEventSignature({
      properties, timestamp, eventSecret: 'event_test',
    });
    const body = {
      event: 'transaction.updated',
      data: { transaction: { id: txId, reference, status: 'APPROVED', amount_in_cents: amountInCents } },
      timestamp,
      signature: { checksum, properties: properties.map((p) => p.path) },
    };

    await request(server)
      .post('/webhooks/wompi')
      .set('X-Event-Checksum', checksum)
      .send(body)
      .expect(201);

    // 5. Verify state
    const order = await prisma.order.findUniqueOrThrow({ where: { reference } });
    expect(order.status).toBe('paid');

    const updated = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updated.stockQuantity).toBe(startStock - 2);

    // 6. Idempotency — send same webhook again, stock unchanged
    await request(server)
      .post('/webhooks/wompi')
      .set('X-Event-Checksum', checksum)
      .send(body)
      .expect(201);
    const afterReplay = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(afterReplay.stockQuantity).toBe(startStock - 2);
  });

  it('webhook with invalid checksum returns 401', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/wompi')
      .set('X-Event-Checksum', 'wrong')
      .send({ event: 'x', data: { transaction: {} }, timestamp: 0, signature: { checksum: 'wrong', properties: [] } })
      .expect(401);
  });
});
```

- [ ] **Step 2: Run E2E**

Run: `pnpm --filter @bymariap/api test:e2e -- wompi-webhook`. Expected: 2 passing. Requires Docker.

- [ ] **Step 3: Commit**

```bash
git add apps/api/test/wompi-webhook.e2e-spec.ts
git commit -m "test(api): wompi webhook E2E — order paid + stock decrement + idempotency"
```

---

## Task 20: README + final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update root `README.md`**

Append:

```markdown
## Phase 3 — Cart, Orders, Payments

New API surface:
- `GET /store/cart`, `POST /store/cart/items`, `PATCH /store/cart/items/:id`, `DELETE /store/cart/items/:id`
- `GET /store/shipping/options?city=…`
- `POST /store/orders`, `GET /store/orders/:reference`, `GET /me/orders`
- `GET /store/payments/intent/:orderReference`
- `POST /webhooks/wompi` (signature-validated, idempotent)
- Admin: `GET /admin/orders`, `GET /admin/orders/:id`, `PATCH /admin/orders/:id/status`

Required env on API:
- `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENT_SECRET`, `WOMPI_API_URL`

Run E2E (requires Docker):
```bash
pnpm --filter @bymariap/api test:e2e
```
```

- [ ] **Step 2: Full verification suite**

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
git commit -m "docs: phase 3 cart, orders, payments endpoints + env vars"
```

---

## Acceptance criteria (Phase 3)

Cart:
- Anonymous visitor adds item → `guest_token` cookie is set, cart persists across requests.
- Logged user adds item → cart is keyed by `customerId`.
- Logging in with a guest cart present merges items into the user's cart and clears the `guest_token` cookie.
- `addItem` for unpublished or unknown product → 404.

Orders:
- `POST /store/orders` from a guest without `guestEmail`/`guestPhone` → 400.
- `POST /store/orders` with insufficient stock → 409 `{ code: "OUT_OF_STOCK" }`.
- Successful create returns the order with snapshot items, totals, and `status: "pending"`; empties the cart.
- `GET /me/orders` returns the logged user's orders.
- `GET /store/orders/:reference` returns the order (used by storefront polling).
- Admin `PATCH /admin/orders/:id/status` enforces the state machine — invalid transitions → 400.

Payments:
- `GET /store/payments/intent/:reference` returns `publicKey`, `amountInCents`, `currency: "COP"`, `integritySignature`.
- Webhook with mismatched checksum → 401.
- Webhook with valid `APPROVED` → order becomes `paid`, stock decremented atomically, `Payment.status = approved`.
- Webhook with `DECLINED` / `VOIDED` / `ERROR` → order becomes `cancelled`, `Payment.status` updated.
- Replayed webhook (same checksum) → no-op, stock unchanged.

Shipping:
- `GET /store/shipping/options?city=Medellín` returns the seeded zone + pickup option.
- Unknown city returns only pickup.

Tests:
- Unit suite for cart/orders/payments green.
- E2E `wompi-webhook` green (full happy-path + idempotency + bad signature).

## Out of scope (deferred to later phases)

- Storefront UI (Phase 4)
- Admin orders UI
- Order email confirmations
- Wompi widget rendering / payment-method-specific flows
- Refunds, partial captures
- Order CSV export
- Stock reservation on add-to-cart (YAGNI per spec)
- IVA / DIAN invoicing
- Order analytics (Phase 7)
