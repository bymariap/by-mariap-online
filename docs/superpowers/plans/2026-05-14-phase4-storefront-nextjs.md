# Phase 4: Storefront (Next.js 15) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public storefront on Next.js 15 (App Router) that consumes the API from Phases 1-3: home, catalog, product detail with SEO, cart, checkout with Wompi redirect, order confirmation polling, customer account, and Habeas Data policy page. Visual design is taken verbatim from the Stitch project — agents must not invent layouts or styles.

**Architecture:** Next.js 15 App Router + React 19. Product list / detail are Server Components with ISR (60s revalidate) for SEO; product detail emits `Product` JSON-LD. Cart, checkout, account are Client Components driven by TanStack Query against the API. Cookies (`access_token`, `refresh_token`, `guest_token`) are forwarded from `cookies()` in server fetches and sent automatically by the browser with `credentials: 'include'` in client fetches. Wompi flow uses the **Web Checkout redirect** (not the embedded widget) — backend gives the integrity signature, frontend redirects to `checkout.wompi.co` with the reference, Wompi redirects back to `/checkout/confirmacion?id=<reference>` after payment.

**Tech Stack:** Next.js 15, React 19, TanStack Query 5, Tailwind 3, react-hook-form 7, zod 3, lucide-react, sonner.

**Design source (REQUIRED — non-negotiable):**
- Stitch project: **"Cejas Medellín Studio"** (id `5755618256776589056`).
- For every page-building task, the agent **must** call the Stitch MCP tools (`mcp__stitch__get_project`, `mcp__stitch__list_screens`, `mcp__stitch__get_screen`) to fetch the source-of-truth screen before writing code.
- If a referenced screen does not exist in the project, the agent must **stop and report** — do not invent the design.
- Colors, type scale, spacing, radii, and component primitives come from the Stitch design system (or, if none exists, derived from observed screens — see Task 1).

**Prerequisites:** Phase 3 plan executed and merged. API exposes `/store/products`, `/store/categories`, `/store/cart`, `/store/orders`, `/store/payments/intent`, `/me`, `/me/orders`. CORS allows the storefront origin (we add it in Task 2).

**Scope (does NOT include):** admin orders UI (separate plan), notifications, services/appointments storefront (Phase 5 storefront updates), refunds UI, blog/CMS, search ranking. No multi-language — Spanish only.

---

## File Structure

```
apps/storefront/                              # NEW
├── package.json
├── next.config.mjs
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.example
├── public/
│   └── ...                                   # images exported from Stitch (if any)
└── src/
    ├── app/
    │   ├── layout.tsx                        # root layout (header + footer)
    │   ├── page.tsx                          # home
    │   ├── globals.css
    │   ├── sitemap.ts
    │   ├── robots.ts
    │   ├── providers.tsx                     # QueryClient + AuthProvider
    │   ├── productos/
    │   │   ├── page.tsx                      # catalog list
    │   │   └── [slug]/page.tsx               # product detail (ISR)
    │   ├── carrito/page.tsx
    │   ├── checkout/
    │   │   ├── page.tsx
    │   │   └── confirmacion/page.tsx
    │   ├── login/page.tsx
    │   ├── mi-cuenta/
    │   │   ├── page.tsx
    │   │   └── pedidos/page.tsx
    │   └── politica-tratamiento-datos/page.tsx
    ├── lib/
    │   ├── api/
    │   │   ├── server.ts                     # server-side fetcher (cookies forwarded)
    │   │   ├── client.ts                     # client-side fetcher (credentials: include)
    │   │   └── endpoints.ts                  # path constants
    │   ├── cart/
    │   │   ├── hooks.ts
    │   │   └── types.ts
    │   ├── auth/
    │   │   └── hooks.ts
    │   ├── format.ts                         # formatCop, formatDate
    │   ├── seo.ts                            # product JSON-LD builder
    │   └── wompi.ts                          # build redirect URL
    ├── components/
    │   ├── ui/                               # primitives matching Stitch design system
    │   │   ├── button.tsx
    │   │   ├── input.tsx
    │   │   ├── label.tsx
    │   │   ├── textarea.tsx
    │   │   ├── select.tsx
    │   │   ├── badge.tsx
    │   │   └── separator.tsx
    │   ├── header.tsx
    │   ├── footer.tsx
    │   ├── cart-icon-button.tsx
    │   ├── product-card.tsx
    │   ├── category-filter.tsx
    │   ├── add-to-cart-button.tsx
    │   ├── quantity-input.tsx
    │   └── order-status-pill.tsx
    └── design-tokens.ts                      # exported from Stitch in Task 1
```

---

## Task 1: Discover the Stitch design source

This task is **discovery only** — no code. Its output is a written record (`apps/storefront/DESIGN.md`) the rest of the plan references.

**Files:**
- Create: `apps/storefront/DESIGN.md`

- [ ] **Step 1: Fetch the Stitch project**

Call `mcp__stitch__get_project` with `id: "5755618256776589056"`. Capture: project name, screen list, any linked design system id.

- [ ] **Step 2: List screens**

Call `mcp__stitch__list_screens` for the project. Record every screen's id + name. Expected screens (names may differ slightly — match by intent):

- Home / inicio
- Catálogo / productos (listing)
- Detalle de producto
- Carrito
- Checkout
- Confirmación de orden
- Login / iniciar sesión
- Mi cuenta / pedidos
- Política de tratamiento de datos (optional — may be a generic text page)

If any of the first 7 is missing, **stop and report** before continuing the plan. The plan cannot proceed without them.

- [ ] **Step 3: Check for an existing design system**

Call `mcp__stitch__list_design_systems`. If one is linked to this project, fetch it (note the id and tokens: colors, typography, radii, spacing).

If none exists, in Step 4 we'll derive tokens from observed screens.

- [ ] **Step 4: Extract design tokens**

Get one or two screens (`mcp__stitch__get_screen`) — pick the home and product detail — and identify:
- Brand color (primary)
- Secondary / accent color (if any)
- Background, surface, border, text colors
- Body + heading font families
- Heading scale (h1 / h2 / h3 sizes)
- Default border radius
- Container max-width and gutter

- [ ] **Step 5: Write `apps/storefront/DESIGN.md`**

Document everything found. Template:

```markdown
# Storefront Design — Cejas Medellín Studio (Stitch source)

Stitch project id: 5755618256776589056

## Screens (id → purpose)
- <screen-id>: Home
- <screen-id>: Catálogo
- <screen-id>: Detalle de producto
- <screen-id>: Carrito
- <screen-id>: Checkout
- <screen-id>: Confirmación
- <screen-id>: Login
- <screen-id>: Mi cuenta
- <screen-id> (optional): Política

## Design system
Source: <linked design system id, or "derived from screens">

### Colors (HSL or hex as found)
- primary: <value>
- primary-foreground: <value>
- background: <value>
- foreground: <value>
- muted / surface: <value>
- border: <value>
- accent: <value>
- destructive: <value>

### Typography
- heading family: <value>
- body family: <value>
- h1: <size>/<line-height>
- h2: <size>/<line-height>
- h3: <size>/<line-height>
- body: <size>/<line-height>
- small: <size>/<line-height>

### Spacing & layout
- container max-width: <value>
- gutter: <value>
- default border radius: <value>
- card radius: <value>
- button height (md): <value>

## Notes
<anything else the agent should not lose>
```

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/DESIGN.md
git commit -m "docs(storefront): capture stitch design source + tokens"
```

---

## Task 2: Scaffold Next.js 15 storefront

**Files:**
- Create: `apps/storefront/package.json`, `next.config.mjs`, `tsconfig.json`, `.env.example`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Modify: `apps/api/.env.example`, `apps/api/src/main.ts` (CORS)

- [ ] **Step 1: Create `apps/storefront/package.json`**

```json
{
  "name": "@bymariap/storefront",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@bymariap/types": "workspace:*",
    "@hookform/resolvers": "^3.4.0",
    "@tanstack/react-query": "^5.40.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.395.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.52.0",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.3.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@bymariap/config-tsconfig": "workspace:*",
    "@types/node": "^20.12.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-config-next": "^15.0.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `apps/storefront/next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
};
```

- [ ] **Step 3: Create `apps/storefront/tsconfig.json`**

```json
{
  "extends": "@bymariap/config-tsconfig/base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "noEmit": true,
    "incremental": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "src/**/*", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `apps/storefront/.env.example`**

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
API_INTERNAL_BASE_URL=http://localhost:3001
NEXT_PUBLIC_WOMPI_REDIRECT_BASE=https://checkout.wompi.co/p
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 5: Add CORS origin on API**

Edit `apps/api/.env.example`:
```
ADMIN_ORIGIN=http://localhost:5173,http://localhost:3000
```

The API's `enableCors` already splits on `,` (Phase 2 Task 9), so no code change needed — just remind the operator to also update their local `apps/api/.env`.

- [ ] **Step 6: Stub `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Stub `src/app/layout.tsx`**

```tsx
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: { default: 'Cejas Medellín Studio', template: '%s — Cejas Medellín Studio' },
  description: 'Diseño de cejas y productos para el cuidado profesional en Medellín.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Stub `src/app/page.tsx`**

```tsx
export default function HomePage() {
  return <div className="p-6">storefront skeleton — to be replaced from Stitch</div>;
}
```

- [ ] **Step 9: Install + sanity check**

Run:
```bash
cp apps/storefront/.env.example apps/storefront/.env.local
pnpm install
pnpm --filter @bymariap/storefront dev
```

Expected: Next dev server on http://localhost:3000, page renders. Stop server.

- [ ] **Step 10: Commit**

```bash
git add apps/storefront apps/api/.env.example pnpm-lock.yaml
git commit -m "feat(storefront): scaffold next.js 15 app + CORS origin update"
```

---

## Task 3: Tailwind config + design tokens from Stitch

**Files:**
- Create: `apps/storefront/postcss.config.mjs`, `tailwind.config.ts`, `src/design-tokens.ts`
- Modify: `apps/storefront/src/app/globals.css`

- [ ] **Step 1: Create `postcss.config.mjs`**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 2: Create `src/design-tokens.ts` from `DESIGN.md`**

Translate the tokens captured in Task 1 into TypeScript constants. Example shape (replace values with the ones in `DESIGN.md`):

```ts
// src/design-tokens.ts
export const tokens = {
  colors: {
    primary:            'hsl(<from DESIGN.md>)',
    primaryForeground:  'hsl(<from DESIGN.md>)',
    background:         'hsl(<from DESIGN.md>)',
    foreground:         'hsl(<from DESIGN.md>)',
    muted:              'hsl(<from DESIGN.md>)',
    mutedForeground:    'hsl(<from DESIGN.md>)',
    border:             'hsl(<from DESIGN.md>)',
    accent:             'hsl(<from DESIGN.md>)',
    accentForeground:   'hsl(<from DESIGN.md>)',
    destructive:        'hsl(<from DESIGN.md>)',
    destructiveForeground: 'hsl(<from DESIGN.md>)',
  },
  fontFamily: {
    heading: '<from DESIGN.md>',
    body:    '<from DESIGN.md>',
  },
  radius: {
    sm: '<from DESIGN.md>',
    md: '<from DESIGN.md>',
    lg: '<from DESIGN.md>',
  },
  container: {
    maxWidth: '<from DESIGN.md>',
    gutter:   '<from DESIGN.md>',
  },
} as const;
```

- [ ] **Step 3: Create `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        border:     'hsl(var(--border))',
        primary:    { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        muted:      { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent:     { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive:{ DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
      },
      borderRadius: {
        sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)',
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body:    'var(--font-body)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 4: Replace `src/app/globals.css`**

Put the actual HSL values from `DESIGN.md` here. Example skeleton (replace `<…>`):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: <value>;
    --foreground: <value>;
    --border: <value>;
    --primary: <value>;
    --primary-foreground: <value>;
    --muted: <value>;
    --muted-foreground: <value>;
    --accent: <value>;
    --accent-foreground: <value>;
    --destructive: <value>;
    --destructive-foreground: <value>;

    --radius-sm: <value>;
    --radius-md: <value>;
    --radius-lg: <value>;

    --font-heading: <value>;
    --font-body: <value>;
  }
  body { @apply bg-background text-foreground font-body antialiased; }
  h1, h2, h3, h4 { @apply font-heading; }
}
```

If the Stitch design specifies Google Fonts, add the appropriate `next/font` import in `src/app/layout.tsx` to load them.

- [ ] **Step 5: Verify with a colored block**

Replace `src/app/page.tsx` temporarily:
```tsx
export default function HomePage() {
  return (
    <main className="container py-10">
      <h1 className="text-4xl">Cejas Medellín Studio</h1>
      <p className="text-muted-foreground">Tipografía + colores cargados desde Stitch.</p>
      <button className="mt-4 h-10 px-4 rounded-md bg-primary text-primary-foreground">Probar</button>
    </main>
  );
}
```

Run `pnpm --filter @bymariap/storefront dev` → http://localhost:3000 should render with the Stitch palette and font. If the look does not match the Home screen in Stitch, fix tokens before continuing.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront
git commit -m "feat(storefront): tailwind theme + tokens from stitch design"
```

---

## Task 4: UI primitives matching Stitch components

**Files:**
- Create: `apps/storefront/src/components/ui/button.tsx`, `input.tsx`, `label.tsx`, `textarea.tsx`, `select.tsx`, `badge.tsx`, `separator.tsx`
- Create: `apps/storefront/src/lib/format.ts`
- Create: `apps/storefront/src/lib/cn.ts`

- [ ] **Step 1: Use Stitch components as source of truth**

For each primitive below, before writing it, the agent should grep across screens (via `mcp__stitch__get_screen` on any screen that uses the primitive — typically the catalog and checkout) to inspect:
- padding / height
- border vs. no border
- hover/focus states
- typography weight & size

The code below is the **structural skeleton** — fill style classes from the Stitch component spec.

- [ ] **Step 2: `src/lib/cn.ts`**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

- [ ] **Step 3: `src/lib/format.ts`**

```ts
export function formatCop(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}
```

- [ ] **Step 4: `components/ui/button.tsx`**

```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'default' | 'outline' | 'ghost' | 'destructive' | 'link';
type Size = 'sm' | 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  default:     'bg-primary text-primary-foreground hover:opacity-90',
  outline:     'border border-border bg-background hover:bg-muted',
  ghost:       'hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  link:        'underline-offset-4 hover:underline text-foreground',
};
const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition disabled:opacity-50 disabled:pointer-events-none',
        variantClasses[variant], sizeClasses[size], className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
```

- [ ] **Step 5: `input.tsx`, `label.tsx`, `textarea.tsx`, `select.tsx`**

These are structurally identical to the admin's (Phase 2 Task 13) — copy them, then adjust paddings, heights, and border treatment to match the Stitch checkout form. Heights typically go up in a public storefront (h-12).

- [ ] **Step 6: `badge.tsx`, `separator.tsx`**

```tsx
// badge.tsx
import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
export function Badge({ className, ...p }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-block rounded-full bg-muted px-3 py-1 text-xs', className)} {...p} />;
}

// separator.tsx
import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
export function Separator({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('h-px w-full bg-border', className)} {...p} />;
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/storefront/src
git commit -m "feat(storefront): ui primitives (button, input, label, textarea, select, badge, separator)"
```

---

## Task 5: API client — server + browser variants

**Files:**
- Create: `apps/storefront/src/lib/api/endpoints.ts`
- Create: `apps/storefront/src/lib/api/server.ts`
- Create: `apps/storefront/src/lib/api/client.ts`

- [ ] **Step 1: `endpoints.ts`**

```ts
export const endpoints = {
  storeCategories:  '/store/categories',
  storeProducts:    '/store/products',
  storeProduct:     (slug: string) => `/store/products/${slug}`,
  storeCart:        '/store/cart',
  storeCartItems:   '/store/cart/items',
  storeCartItem:    (id: string) => `/store/cart/items/${id}`,
  storeShipping:    (city: string) => `/store/shipping/options?city=${encodeURIComponent(city)}`,
  storeOrders:      '/store/orders',
  storeOrder:       (ref: string) => `/store/orders/${ref}`,
  storePayIntent:   (ref: string) => `/store/payments/intent/${ref}`,
  authLogin:        '/auth/login',
  authLogout:       '/auth/logout',
  authRefresh:      '/auth/refresh',
  me:               '/me',
  meOrders:         '/me/orders',
} as const;
```

- [ ] **Step 2: `server.ts`** (used from Server Components)

```ts
import { cookies, headers } from 'next/headers';

const BASE = process.env.API_INTERNAL_BASE_URL!;

export async function serverFetch<T>(
  path: string,
  init: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {},
): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      cookie: cookieHeader,
    },
    cache: init.cache ?? (init.next?.revalidate !== undefined ? undefined : 'no-store'),
  });
  if (!res.ok) {
    throw new ApiError(res.status, await safe(res), res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function safe(res: Response) {
  try { return await res.json(); } catch { return null; }
}

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, msg: string) { super(msg); }
}
```

- [ ] **Step 3: `client.ts`** (used from Client Components)

```ts
'use client';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, msg: string) { super(msg); }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await safe(res);
    throw new ApiError(res.status, data, (data as any)?.message ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function safe(res: Response) { try { return await res.json(); } catch { return null; } }

export const api = {
  get:    <T>(p: string) => request<T>('GET', p),
  post:   <T>(p: string, body?: unknown) => request<T>('POST', p, body),
  patch:  <T>(p: string, body?: unknown) => request<T>('PATCH', p, body),
  delete: <T = void>(p: string) => request<T>('DELETE', p),
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/lib/api
git commit -m "feat(storefront): api fetchers — server (cookies forwarded) + client (credentials include)"
```

---

## Task 6: Providers (QueryClient) + cart hooks

**Files:**
- Create: `apps/storefront/src/app/providers.tsx`
- Create: `apps/storefront/src/lib/cart/hooks.ts`
- Create: `apps/storefront/src/lib/auth/hooks.ts`
- Modify: `apps/storefront/src/app/layout.tsx`

- [ ] **Step 1: `providers.tsx`**

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ReactNode, useState } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000, retry: 1 } },
  }));
  return (
    <QueryClientProvider client={qc}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: `lib/cart/hooks.ts`**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { CartDTO } from '@bymariap/types';

export function useCart() {
  return useQuery({ queryKey: ['cart'], queryFn: () => api.get<CartDTO>(endpoints.storeCart) });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { productId: string; quantity: number }) =>
      api.post<CartDTO>(endpoints.storeCartItems, input),
    onSuccess: (cart) => qc.setQueryData(['cart'], cart),
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; quantity: number }) =>
      api.patch<CartDTO>(endpoints.storeCartItem(input.id), { quantity: input.quantity }),
    onSuccess: (cart) => qc.setQueryData(['cart'], cart),
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<CartDTO>(endpoints.storeCartItem(id)),
    onSuccess: (cart) => qc.setQueryData(['cart'], cart),
  });
}
```

- [ ] **Step 3: `lib/auth/hooks.ts`**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

export interface Me { id: string; email: string; fullName: string; phone: string | null; role: { name: string }; }

export function useMe() {
  return useQuery<Me | null>({
    queryKey: ['me'],
    queryFn: async () => {
      try { return await api.get<Me>(endpoints.me); }
      catch { return null; }
    },
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api.post<{ ok: true }>(endpoints.authLogin, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ ok: true }>(endpoints.authLogout),
    onSuccess: () => qc.clear(),
  });
}
```

- [ ] **Step 4: Wire `Providers` into root layout**

Update `src/app/layout.tsx` (keep metadata + html/body, wrap children):

```tsx
import './globals.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Cejas Medellín Studio', template: '%s — Cejas Medellín Studio' },
  description: 'Diseño de cejas y productos para el cuidado profesional en Medellín.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src
git commit -m "feat(storefront): query providers + cart + auth hooks"
```

---

## Task 7: Header + Footer per Stitch

**Files:**
- Create: `apps/storefront/src/components/header.tsx`, `footer.tsx`, `cart-icon-button.tsx`
- Modify: `apps/storefront/src/app/layout.tsx`

- [ ] **Step 1: Fetch the home screen from Stitch**

Call `mcp__stitch__get_screen` for the home screen id. Look specifically at the header and footer — note: logo position, primary nav links, cart icon style, search bar (if present), account link, and footer content (links, social, copyright).

- [ ] **Step 2: Write `cart-icon-button.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart/hooks';
import { Badge } from '@/components/ui/badge';

export function CartIconButton() {
  const cart = useCart();
  const count = cart.data?.items.reduce((s, it) => s + it.quantity, 0) ?? 0;
  return (
    <Link href="/carrito" className="relative inline-flex items-center" aria-label="Carrito">
      <ShoppingBag className="h-6 w-6" />
      {count > 0 && (
        <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground">{count}</Badge>
      )}
    </Link>
  );
}
```

- [ ] **Step 3: Write `header.tsx`**

Structure must match the Stitch home screen. Skeleton (adjust nav items + spacing to Stitch):

```tsx
import Link from 'next/link';
import { CartIconButton } from './cart-icon-button';

export function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="font-heading text-xl">Cejas Medellín Studio</Link>
        <nav className="hidden md:flex gap-6 text-sm">
          <Link href="/productos">Productos</Link>
          <Link href="/politica-tratamiento-datos">Política de datos</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm">Iniciar sesión</Link>
          <CartIconButton />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Write `footer.tsx`**

Match the Stitch footer. Skeleton:

```tsx
export function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="container py-8 text-sm text-muted-foreground flex flex-col md:flex-row justify-between gap-4">
        <p>© {new Date().getFullYear()} Cejas Medellín Studio. Todos los derechos reservados.</p>
        <nav className="flex gap-4">
          <a href="/politica-tratamiento-datos">Política de tratamiento de datos</a>
        </nav>
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Plug into the root layout**

```tsx
// src/app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export const metadata = { /* unchanged */ };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <Header />
          <main className="min-h-[calc(100vh-9rem)]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src
git commit -m "feat(storefront): header + footer + cart icon button per stitch"
```

---

## Task 8: Home page per Stitch

**Files:**
- Modify: `apps/storefront/src/app/page.tsx`
- Create: `apps/storefront/src/components/product-card.tsx`

- [ ] **Step 1: Fetch the home screen**

Call `mcp__stitch__get_screen` for the home id. Identify each section: hero, featured products grid, value props / about, CTA. The page must implement every section that exists in Stitch — same order, same structure. Do not skip sections.

- [ ] **Step 2: Write `product-card.tsx`** (matches the card on the home + catalog screens)

```tsx
import Link from 'next/link';
import Image from 'next/image';
import type { ProductDTO } from '@bymariap/types';
import { formatCop } from '@/lib/format';

export function ProductCard({ product }: { product: ProductDTO }) {
  const img = product.imageUrls[0];
  return (
    <Link href={`/productos/${product.slug}`} className="group block">
      <div className="aspect-square rounded-md overflow-hidden bg-muted">
        {img && (
          <Image
            src={img} alt={product.name} width={600} height={600}
            className="h-full w-full object-cover group-hover:scale-105 transition"
          />
        )}
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="font-medium">{product.name}</h3>
        <p className="text-sm text-muted-foreground">{formatCop(product.priceCop)}</p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Replace `src/app/page.tsx`**

Implement each section from the Stitch home screen. Featured products are fetched server-side. Skeleton (extend to match Stitch sections):

```tsx
import { serverFetch } from '@/lib/api/server';
import { endpoints } from '@/lib/api/endpoints';
import { ProductCard } from '@/components/product-card';
import type { ProductDTO } from '@bymariap/types';

export const revalidate = 60;

export default async function HomePage() {
  const products = await serverFetch<ProductDTO[]>(endpoints.storeProducts, { next: { revalidate: 60 } });

  return (
    <>
      {/* HERO — replace with the exact Stitch hero structure */}
      <section className="container py-12">
        <h1 className="text-5xl font-heading">Cejas Medellín Studio</h1>
        <p className="mt-4 max-w-prose text-muted-foreground">
          {/* copy from Stitch */}
        </p>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="container py-12">
        <h2 className="text-2xl font-heading mb-6">Productos destacados</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Any other Stitch sections — about, testimonials, CTA — added here verbatim */}
    </>
  );
}
```

The agent must replace the comments with the actual content/structure observed in Stitch.

- [ ] **Step 4: Smoke check**

Run dev server, open http://localhost:3000. Expected: header + footer + hero + 8 product cards (using Phase 2 seed if `SEED_DEMO_DATA=true`).

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src
git commit -m "feat(storefront): home page with featured products per stitch"
```

---

## Task 9: Catalog `/productos` with category filter

**Files:**
- Create: `apps/storefront/src/app/productos/page.tsx`
- Create: `apps/storefront/src/components/category-filter.tsx`

- [ ] **Step 1: Fetch the catalog screen**

`mcp__stitch__get_screen` for the catalog id. Note: layout of filter (sidebar vs top), grid columns at each breakpoint, sort options (if any).

- [ ] **Step 2: `category-filter.tsx`** (client component)

```tsx
'use client';

import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import type { CategoryDTO } from '@bymariap/types';
import { cn } from '@/lib/cn';

export function CategoryFilter({ categories }: { categories: CategoryDTO[] }) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const active = sp.get('categoria');

  function hrefFor(slug: string | null) {
    const next = new URLSearchParams(sp.toString());
    if (slug) next.set('categoria', slug); else next.delete('categoria');
    return `${pathname}?${next.toString()}`;
  }

  return (
    <nav className="flex flex-wrap gap-2">
      <Link href={hrefFor(null)} className={cn('rounded-full border px-4 py-1.5 text-sm', !active && 'bg-primary text-primary-foreground')}>
        Todos
      </Link>
      {categories.map((c) => (
        <Link key={c.id} href={hrefFor(c.slug)} className={cn('rounded-full border px-4 py-1.5 text-sm', active === c.slug && 'bg-primary text-primary-foreground')}>
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: `src/app/productos/page.tsx`** (server component)

```tsx
import { serverFetch } from '@/lib/api/server';
import { endpoints } from '@/lib/api/endpoints';
import { ProductCard } from '@/components/product-card';
import { CategoryFilter } from '@/components/category-filter';
import type { CategoryDTO, ProductDTO } from '@bymariap/types';

export const revalidate = 60;

export const metadata = { title: 'Productos' };

interface PageProps { searchParams: Promise<{ categoria?: string }>; }

export default async function CatalogPage({ searchParams }: PageProps) {
  const { categoria } = await searchParams;
  const productsPath = categoria
    ? `${endpoints.storeProducts}?categorySlug=${encodeURIComponent(categoria)}`
    : endpoints.storeProducts;

  const [products, categories] = await Promise.all([
    serverFetch<ProductDTO[]>(productsPath, { next: { revalidate: 60 } }),
    serverFetch<CategoryDTO[]>(endpoints.storeCategories, { next: { revalidate: 300 } }),
  ]);

  return (
    <div className="container py-10 space-y-8">
      <header>
        <h1 className="text-4xl font-heading">Productos</h1>
        <p className="text-muted-foreground mt-2">{products.length} producto(s)</p>
      </header>
      <CategoryFilter categories={categories} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      {products.length === 0 && <p className="text-muted-foreground">No hay productos en esta categoría.</p>}
    </div>
  );
}
```

Adjust grid columns, spacing, and filter position to match the Stitch catalog screen.

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src
git commit -m "feat(storefront): catalog page with category filter (ISR)"
```

---

## Task 10: Product detail `/productos/[slug]` with SEO

**Files:**
- Create: `apps/storefront/src/app/productos/[slug]/page.tsx`
- Create: `apps/storefront/src/lib/seo.ts`
- Create: `apps/storefront/src/components/add-to-cart-button.tsx`

- [ ] **Step 1: Fetch the product detail screen**

`mcp__stitch__get_screen` for the detail id. Note: gallery layout (single image vs. thumbnails), buy-box (price, qty, add-to-cart placement), description block, related-products section.

- [ ] **Step 2: `add-to-cart-button.tsx`** (client)

```tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAddToCart } from '@/lib/cart/hooks';
import { Button } from '@/components/ui/button';

export function AddToCartButton({ productId }: { productId: string }) {
  const [qty, setQty] = useState(1);
  const mut = useAddToCart();

  return (
    <div className="flex items-center gap-3">
      <input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
        className="h-11 w-20 rounded-md border border-border px-3 text-center"
      />
      <Button
        size="lg"
        onClick={() => mut.mutate({ productId, quantity: qty }, {
          onSuccess: () => toast.success('Agregado al carrito'),
          onError: (e: any) => toast.error(e?.message ?? 'No se pudo agregar'),
        })}
        disabled={mut.isPending}
      >
        Agregar al carrito
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: `lib/seo.ts`** (JSON-LD builder)

```ts
import type { ProductDTO } from '@bymariap/types';

export function productJsonLd(product: ProductDTO, baseUrl: string) {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    image: product.imageUrls,
    sku: product.id,
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/productos/${product.slug}`,
      priceCurrency: 'COP',
      price: product.priceCop.toString(),
      availability: product.stockQuantity > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };
}
```

- [ ] **Step 4: `src/app/productos/[slug]/page.tsx`**

```tsx
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { serverFetch, ApiError } from '@/lib/api/server';
import { endpoints } from '@/lib/api/endpoints';
import { productJsonLd } from '@/lib/seo';
import { formatCop } from '@/lib/format';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { Badge } from '@/components/ui/badge';
import type { ProductDTO } from '@bymariap/types';

export const revalidate = 60;

interface Props { params: Promise<{ slug: string }>; }

async function fetchProduct(slug: string): Promise<ProductDTO | null> {
  try {
    return await serverFetch<ProductDTO>(endpoints.storeProduct(slug), { next: { revalidate: 60 } });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await fetchProduct(slug);
  if (!p) return { title: 'Producto no encontrado' };
  return {
    title: p.name,
    description: p.description ?? undefined,
    openGraph: {
      title: p.name,
      description: p.description ?? undefined,
      images: p.imageUrls.map((url) => ({ url })),
    },
  };
}

export default async function ProductDetail({ params }: Props) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  return (
    <article className="container py-10 grid md:grid-cols-2 gap-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product, baseUrl)) }}
      />

      {/* Gallery */}
      <div className="space-y-4">
        {product.imageUrls.length > 0 ? (
          <div className="aspect-square rounded-lg overflow-hidden bg-muted">
            <Image src={product.imageUrls[0]} alt={product.name} width={900} height={900} className="h-full w-full object-cover" priority />
          </div>
        ) : (
          <div className="aspect-square rounded-lg bg-muted" />
        )}
        {product.imageUrls.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {product.imageUrls.slice(1).map((u) => (
              <div key={u} className="aspect-square rounded-md overflow-hidden bg-muted">
                <Image src={u} alt="" width={300} height={300} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buy box */}
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {product.categories.map((c) => <Badge key={c.id}>{c.name}</Badge>)}
        </div>
        <h1 className="text-4xl font-heading">{product.name}</h1>
        <p className="text-2xl">{formatCop(product.priceCop)}</p>
        {product.description && <p className="text-muted-foreground whitespace-pre-line">{product.description}</p>}
        <p className="text-sm text-muted-foreground">
          {product.stockQuantity > 0 ? `Disponibles: ${product.stockQuantity}` : 'Agotado'}
        </p>
        {product.stockQuantity > 0 && <AddToCartButton productId={product.id} />}
      </div>
    </article>
  );
}
```

Adjust the structure (gallery columns, buy-box order, typography sizes) to match the Stitch detail screen exactly.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src
git commit -m "feat(storefront): product detail with ISR + metadata + json-ld + add-to-cart"
```

---

## Task 11: Cart page `/carrito`

**Files:**
- Create: `apps/storefront/src/app/carrito/page.tsx`
- Create: `apps/storefront/src/components/quantity-input.tsx`

- [ ] **Step 1: Fetch the cart screen**

`mcp__stitch__get_screen` for the cart id. Note: row layout, mobile collapse behavior, totals card position, checkout CTA placement.

- [ ] **Step 2: `quantity-input.tsx`**

```tsx
'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

export function QuantityInput({
  value, onChange, min = 1, max = 99, className,
}: { value: number; onChange: (n: number) => void; min?: number; max?: number; className?: string }) {
  return (
    <div className={cn('inline-flex items-center border border-border rounded-md', className)}>
      <button type="button" className="h-10 w-10 grid place-items-center" onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
        className="h-10 w-12 text-center bg-transparent"
      />
      <button type="button" className="h-10 w-10 grid place-items-center" onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: `src/app/carrito/page.tsx`**

```tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { useCart, useRemoveCartItem, useUpdateCartItem } from '@/lib/cart/hooks';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { QuantityInput } from '@/components/quantity-input';
import { formatCop } from '@/lib/format';

export default function CartPage() {
  const cart = useCart();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();

  if (cart.isLoading) return <div className="container py-10">Cargando…</div>;
  if (!cart.data || cart.data.items.length === 0) {
    return (
      <div className="container py-16 text-center space-y-6">
        <h1 className="text-3xl font-heading">Tu carrito está vacío</h1>
        <Button asChild><Link href="/productos">Ver productos</Link></Button>
      </div>
    );
  }

  return (
    <div className="container py-10 grid lg:grid-cols-3 gap-10">
      <div className="lg:col-span-2 space-y-4">
        <h1 className="text-3xl font-heading mb-4">Tu carrito</h1>
        {cart.data.items.map((it) => (
          <div key={it.id} className="flex gap-4 border-b border-border pb-4">
            <div className="h-24 w-24 rounded-md overflow-hidden bg-muted shrink-0">
              {it.productImageUrl && <Image src={it.productImageUrl} alt={it.productName} width={120} height={120} className="h-full w-full object-cover" />}
            </div>
            <div className="flex-1 space-y-2">
              <Link href={`/productos/${it.productSlug}`} className="font-medium hover:underline">{it.productName}</Link>
              <p className="text-sm text-muted-foreground">{formatCop(it.unitPriceSnapshot)} c/u</p>
              <div className="flex items-center gap-3">
                <QuantityInput value={it.quantity} onChange={(q) => update.mutate({ id: it.id, quantity: q })} />
                <button onClick={() => remove.mutate(it.id)} className="text-muted-foreground hover:text-destructive" aria-label="Quitar">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="text-right font-medium">{formatCop(it.lineTotal)}</div>
          </div>
        ))}
      </div>

      <aside className="space-y-4 border border-border rounded-lg p-6 h-fit">
        <h2 className="text-xl font-heading">Resumen</h2>
        <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCop(cart.data.subtotal)}</span></div>
        <p className="text-xs text-muted-foreground">El envío se calcula en el siguiente paso.</p>
        <Separator />
        <Button asChild size="lg" className="w-full"><Link href="/checkout">Ir a pagar</Link></Button>
      </aside>
    </div>
  );
}
```

> **Note:** the `Button asChild` pattern requires a small change — the storefront's `Button` does not support `asChild`. Either add a Radix-like `asChild` to it, or replace those buttons with `<Link>` styled like a button. Simpler — use a plain Link with button classes:

Replace `<Button asChild><Link href="/checkout">…</Link></Button>` with:

```tsx
<Link href="/checkout" className="inline-flex h-12 px-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-medium w-full">
  Ir a pagar
</Link>
```

Apply the same fix to the empty-cart CTA.

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src
git commit -m "feat(storefront): cart page with quantity edit + remove + summary"
```

---

## Task 12: Checkout `/checkout`

**Files:**
- Create: `apps/storefront/src/app/checkout/page.tsx`
- Create: `apps/storefront/src/lib/wompi.ts`

- [ ] **Step 1: Fetch the checkout screen**

`mcp__stitch__get_screen` for the checkout id. Note: form layout (1 column vs 2 column with summary aside), field grouping (contact, shipping, payment), button copy.

- [ ] **Step 2: `lib/wompi.ts`**

```ts
import type { PaymentIntentDTO } from '@bymariap/types';

export function buildWompiRedirectUrl(intent: PaymentIntentDTO, redirectUrl: string): string {
  const base = process.env.NEXT_PUBLIC_WOMPI_REDIRECT_BASE!;
  const params = new URLSearchParams({
    'public-key': intent.publicKey,
    currency: intent.currency,
    'amount-in-cents': String(intent.amountInCents),
    reference: intent.reference,
    'signature:integrity': intent.integritySignature,
    'redirect-url': redirectUrl,
  });
  return `${base}/?${params.toString()}`;
}
```

- [ ] **Step 3: `src/app/checkout/page.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useCart } from '@/lib/cart/hooks';
import { useMe } from '@/lib/auth/hooks';
import { buildWompiRedirectUrl } from '@/lib/wompi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { formatCop } from '@/lib/format';
import type { OrderDTO, PaymentIntentDTO, ShippingOptionDTO } from '@bymariap/types';

const schema = z.object({
  city: z.string().min(2),
  shippingZoneId: z.string().min(1),
  fullName: z.string().min(2),
  phone: z.string().min(7),
  address: z.string().min(5),
  notes: z.string().optional(),
  guestEmail: z.string().email().optional().or(z.literal('')),
  guestPhone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const me = useMe();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { city: 'Medellín', shippingZoneId: '', fullName: '', phone: '', address: '', notes: '', guestEmail: '', guestPhone: '' },
  });

  const city = form.watch('city');
  const options = useQuery({
    queryKey: ['shipping', city],
    queryFn: () => api.get<ShippingOptionDTO[]>(endpoints.storeShipping(city)),
    enabled: city.length >= 2,
  });

  // Auto-fill name/phone when logged in
  useEffect(() => {
    if (me.data) {
      form.setValue('fullName', me.data.fullName);
      form.setValue('phone', me.data.phone ?? '');
    }
  }, [me.data, form]);

  useEffect(() => {
    if (!cart.isLoading && (!cart.data || cart.data.items.length === 0)) {
      router.replace('/carrito');
    }
  }, [cart.isLoading, cart.data, router]);

  if (!cart.data) return <div className="container py-10">Cargando…</div>;
  const shippingZone = options.data?.find((o) => o.id === form.watch('shippingZoneId'));
  const shippingCost = shippingZone?.priceCop ?? 0;
  const total = cart.data.subtotal + shippingCost;

  async function onSubmit(values: FormValues) {
    try {
      if (!me.data) {
        if (!values.guestEmail || !values.guestPhone) {
          form.setError('guestEmail', { message: 'Requerido para invitados' });
          return;
        }
      }
      const order = await api.post<OrderDTO>(endpoints.storeOrders, {
        shippingZoneId: values.shippingZoneId,
        shippingAddress: {
          fullName: values.fullName,
          phone: values.phone,
          address: values.address,
          city: values.city,
          notes: values.notes || undefined,
        },
        guestEmail: me.data ? undefined : values.guestEmail,
        guestPhone: me.data ? undefined : values.guestPhone,
      });

      const intent = await api.get<PaymentIntentDTO>(endpoints.storePayIntent(order.reference));
      const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/confirmacion?id=${order.reference}`;
      window.location.href = buildWompiRedirectUrl(intent, redirectUrl);
    } catch (e: any) {
      if (e?.body?.code === 'OUT_OF_STOCK') {
        toast.error('Uno de los productos quedó sin stock. Revisa tu carrito.');
      } else {
        toast.error(e?.message ?? 'No se pudo crear la orden');
      }
    }
  }

  return (
    <div className="container py-10 grid lg:grid-cols-3 gap-10">
      <form onSubmit={form.handleSubmit(onSubmit)} className="lg:col-span-2 space-y-8">
        <h1 className="text-3xl font-heading">Checkout</h1>

        {!me.data && (
          <section className="space-y-4">
            <h2 className="text-xl font-heading">Contacto (invitado)</h2>
            <Field label="Email" error={form.formState.errors.guestEmail?.message}>
              <Input type="email" {...form.register('guestEmail')} />
            </Field>
            <Field label="Teléfono">
              <Input {...form.register('guestPhone')} />
            </Field>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-heading">Envío</h2>
          <Field label="Ciudad"><Input {...form.register('city')} /></Field>
          <Field label="Método de envío">
            <Select {...form.register('shippingZoneId')}>
              <option value="">Selecciona…</option>
              {options.data?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} — {formatCop(o.priceCop)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nombre completo"><Input {...form.register('fullName')} /></Field>
          <Field label="Teléfono"><Input {...form.register('phone')} /></Field>
          <Field label="Dirección"><Input {...form.register('address')} /></Field>
          <Field label="Notas (opcional)"><Textarea {...form.register('notes')} /></Field>
        </section>

        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>Pagar con Wompi</Button>
      </form>

      <aside className="border border-border rounded-lg p-6 space-y-3 h-fit">
        <h2 className="text-xl font-heading">Resumen</h2>
        {cart.data.items.map((it) => (
          <div key={it.id} className="flex justify-between text-sm">
            <span>{it.productName} × {it.quantity}</span>
            <span>{formatCop(it.lineTotal)}</span>
          </div>
        ))}
        <Separator />
        <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCop(cart.data.subtotal)}</span></div>
        <div className="flex justify-between text-sm"><span>Envío</span><span>{formatCop(shippingCost)}</span></div>
        <Separator />
        <div className="flex justify-between font-medium"><span>Total</span><span>{formatCop(total)}</span></div>
      </aside>
    </div>
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

Adjust grouping / spacing to match Stitch checkout exactly.

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src
git commit -m "feat(storefront): checkout form with shipping options + wompi redirect"
```

---

## Task 13: Order confirmation with polling

**Files:**
- Create: `apps/storefront/src/app/checkout/confirmacion/page.tsx`
- Create: `apps/storefront/src/components/order-status-pill.tsx`

- [ ] **Step 1: Fetch the confirmation screen**

`mcp__stitch__get_screen` for the confirmation id. Note: hero icon (success/pending/failure), main copy, summary structure, CTA.

- [ ] **Step 2: `order-status-pill.tsx`**

```tsx
import { cn } from '@/lib/cn';
import type { OrderStatus } from '@bymariap/types';

const styles: Record<OrderStatus, { label: string; className: string }> = {
  pending:   { label: 'Pago pendiente',   className: 'bg-muted text-foreground' },
  paid:      { label: 'Pagado',           className: 'bg-primary text-primary-foreground' },
  preparing: { label: 'En preparación',   className: 'bg-primary text-primary-foreground' },
  shipped:   { label: 'Enviado',          className: 'bg-primary text-primary-foreground' },
  delivered: { label: 'Entregado',        className: 'bg-primary text-primary-foreground' },
  cancelled: { label: 'Cancelado',        className: 'bg-destructive text-destructive-foreground' },
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  const { label, className } = styles[status];
  return <span className={cn('inline-block rounded-full px-3 py-1 text-xs', className)}>{label}</span>;
}
```

- [ ] **Step 3: `src/app/checkout/confirmacion/page.tsx`**

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { OrderStatusPill } from '@/components/order-status-pill';
import { formatCop, formatDate } from '@/lib/format';
import type { OrderDTO } from '@bymariap/types';

export default function ConfirmationPage() {
  const sp = useSearchParams();
  const ref = sp.get('id');

  const order = useQuery<OrderDTO>({
    queryKey: ['order', ref],
    queryFn: () => api.get<OrderDTO>(endpoints.storeOrder(ref!)),
    enabled: Boolean(ref),
    refetchInterval: (q) => {
      const data = q.state.data;
      return data && (data.status === 'pending') ? 3000 : false;
    },
  });

  if (!ref) return <div className="container py-10">Falta el id de la orden.</div>;
  if (order.isLoading) return <div className="container py-10">Consultando estado del pago…</div>;
  if (!order.data) return <div className="container py-10">No se encontró la orden.</div>;

  const o = order.data;
  const isSuccess = o.status === 'paid' || o.status === 'preparing' || o.status === 'shipped' || o.status === 'delivered';
  const isPending = o.status === 'pending';
  const isCancelled = o.status === 'cancelled';

  return (
    <div className="container py-12 max-w-2xl space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-heading">
          {isSuccess && '¡Gracias por tu compra!'}
          {isPending && 'Procesando tu pago…'}
          {isCancelled && 'Pago no completado'}
        </h1>
        <OrderStatusPill status={o.status} />
        <p className="text-muted-foreground text-sm">Referencia: {o.reference}</p>
        <p className="text-muted-foreground text-sm">{formatDate(o.createdAt)}</p>
      </header>

      <div className="border border-border rounded-lg p-6 space-y-3">
        {o.items.map((it) => (
          <div key={it.id} className="flex justify-between text-sm">
            <span>{it.nameSnapshot} × {it.quantity}</span>
            <span>{formatCop(it.unitPriceSnapshot * it.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm pt-3 border-t border-border">
          <span>Subtotal</span><span>{formatCop(o.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Envío ({o.shippingMethod})</span><span>{formatCop(o.shippingCost)}</span>
        </div>
        <div className="flex justify-between font-medium pt-3 border-t border-border">
          <span>Total</span><span>{formatCop(o.total)}</span>
        </div>
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground text-center">
          Estamos esperando la confirmación del pago. Esta página se actualiza automáticamente.
        </p>
      )}
    </div>
  );
}
```

Match the Stitch confirmation visual (icon, color of success vs. cancelled, etc).

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src
git commit -m "feat(storefront): order confirmation with status polling"
```

---

## Task 14: Login `/login`

**Files:**
- Create: `apps/storefront/src/app/login/page.tsx`

- [ ] **Step 1: Fetch the login screen**

`mcp__stitch__get_screen` for the login id. Note: form layout (centered card vs. split layout with hero image), copy.

- [ ] **Step 2: Write `src/app/login/page.tsx`**

```tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useLogin } from '@/lib/auth/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') ?? '/mi-cuenta';
  const login = useLogin();
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  async function onSubmit(v: z.infer<typeof schema>) {
    try {
      await login.mutateAsync(v);
      router.replace(next);
    } catch (e: any) {
      toast.error(e?.message ?? 'Credenciales inválidas');
    }
  }

  return (
    <div className="container py-16 max-w-md">
      <h1 className="text-3xl font-heading mb-6">Iniciar sesión</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" {...form.register('email')} />
        </div>
        <div className="space-y-1">
          <Label>Contraseña</Label>
          <Input type="password" {...form.register('password')} />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>Entrar</Button>
      </form>
    </div>
  );
}
```

Match the Stitch login screen (background, card, hero copy).

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src
git commit -m "feat(storefront): login page"
```

---

## Task 15: Account `/mi-cuenta` + orders `/mi-cuenta/pedidos`

**Files:**
- Create: `apps/storefront/src/app/mi-cuenta/page.tsx`
- Create: `apps/storefront/src/app/mi-cuenta/pedidos/page.tsx`

- [ ] **Step 1: Fetch the account screen(s)**

`mcp__stitch__get_screen` for the account id. There may be a single screen with profile + orders, or two separate screens.

- [ ] **Step 2: `src/app/mi-cuenta/page.tsx`** (profile)

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMe, useLogout } from '@/lib/auth/hooks';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function AccountPage() {
  const me = useMe();
  const router = useRouter();
  const logout = useLogout();

  useEffect(() => {
    if (!me.isLoading && !me.data) router.replace('/login?next=/mi-cuenta');
  }, [me.isLoading, me.data, router]);

  if (!me.data) return <div className="container py-10">Cargando…</div>;

  return (
    <div className="container py-10 max-w-2xl space-y-6">
      <h1 className="text-3xl font-heading">Mi cuenta</h1>
      <div className="border border-border rounded-lg p-6 space-y-2">
        <p><strong>Nombre:</strong> {me.data.fullName}</p>
        <p><strong>Email:</strong> {me.data.email}</p>
        {me.data.phone && <p><strong>Teléfono:</strong> {me.data.phone}</p>}
      </div>
      <Separator />
      <div className="flex gap-3">
        <Link href="/mi-cuenta/pedidos" className="inline-flex h-11 px-5 items-center justify-center rounded-md border border-border">Mis pedidos</Link>
        <Button variant="outline" onClick={() => logout.mutate(undefined, { onSuccess: () => router.replace('/') })}>Cerrar sesión</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `src/app/mi-cuenta/pedidos/page.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useMe } from '@/lib/auth/hooks';
import { OrderStatusPill } from '@/components/order-status-pill';
import { formatCop, formatDate } from '@/lib/format';
import type { OrderDTO } from '@bymariap/types';

export default function OrdersPage() {
  const me = useMe();
  const router = useRouter();
  const orders = useQuery({
    queryKey: ['me-orders'],
    queryFn: () => api.get<OrderDTO[]>(endpoints.meOrders),
    enabled: Boolean(me.data),
  });

  useEffect(() => {
    if (!me.isLoading && !me.data) router.replace('/login?next=/mi-cuenta/pedidos');
  }, [me.isLoading, me.data, router]);

  if (!orders.data) return <div className="container py-10">Cargando…</div>;

  if (orders.data.length === 0) {
    return (
      <div className="container py-10 max-w-3xl space-y-6">
        <h1 className="text-3xl font-heading">Mis pedidos</h1>
        <p className="text-muted-foreground">Aún no has hecho pedidos.</p>
        <Link href="/productos" className="underline">Ver productos</Link>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-3xl space-y-6">
      <h1 className="text-3xl font-heading">Mis pedidos</h1>
      <ul className="space-y-3">
        {orders.data.map((o) => (
          <li key={o.id} className="border border-border rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{o.reference}</p>
              <p className="text-sm text-muted-foreground">{formatDate(o.createdAt)} · {formatCop(o.total)}</p>
            </div>
            <div className="flex items-center gap-3">
              <OrderStatusPill status={o.status} />
              <Link href={`/checkout/confirmacion?id=${o.reference}`} className="text-sm underline">Ver</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src
git commit -m "feat(storefront): account page + orders list"
```

---

## Task 16: Habeas Data policy `/politica-tratamiento-datos`

**Files:**
- Create: `apps/storefront/src/app/politica-tratamiento-datos/page.tsx`

- [ ] **Step 1: Check if Stitch has a screen for this**

Call `mcp__stitch__get_screen` if the screen exists; otherwise this is a long-form text page — render the canonical policy text (legal source provided by the project owner) in a readable typographic layout.

- [ ] **Step 2: Write the page**

```tsx
export const metadata = { title: 'Política de tratamiento de datos' };

export default function HabeasDataPage() {
  return (
    <article className="container py-12 max-w-3xl prose prose-neutral">
      <h1>Política de tratamiento de datos</h1>
      <p className="text-muted-foreground text-sm">Versión 1.0 — vigente desde {/* fecha */}</p>
      {/* Render the full policy here. If the Stitch screen contains the copy, mirror it verbatim;
          otherwise the legal copy supplied by the project owner goes here. */}
      <h2>1. Responsable del tratamiento</h2>
      <p>Cejas Medellín Studio … (datos de contacto)</p>
      <h2>2. Finalidades</h2>
      <p>…</p>
      {/* Continue with: derechos del titular, procedimiento para ejercerlos, vigencia */}
    </article>
  );
}
```

If `prose` classes are not available (no `@tailwindcss/typography` plugin), style headings + paragraphs manually with the design tokens — do not install new dependencies in this task.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src
git commit -m "feat(storefront): habeas data policy page"
```

---

## Task 17: SEO — sitemap + robots

**Files:**
- Create: `apps/storefront/src/app/sitemap.ts`, `apps/storefront/src/app/robots.ts`

- [ ] **Step 1: `sitemap.ts`**

```ts
import type { MetadataRoute } from 'next';
import { serverFetch } from '@/lib/api/server';
import { endpoints } from '@/lib/api/endpoints';
import type { ProductDTO } from '@bymariap/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const products = await serverFetch<ProductDTO[]>(endpoints.storeProducts, { next: { revalidate: 300 } });

  const staticRoutes = ['/', '/productos', '/politica-tratamiento-datos'].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.7,
  }));

  const productRoutes = products.map((p) => ({
    url: `${baseUrl}/productos/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
```

- [ ] **Step 2: `robots.ts`**

```ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/carrito', '/checkout', '/mi-cuenta', '/login'] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src
git commit -m "feat(storefront): sitemap + robots"
```

---

## Task 18: Manual smoke test

**Files:** none — verification step.

- [ ] **Step 1: Start API + storefront together**

Terminals:
```bash
pnpm --filter @bymariap/api dev
pnpm --filter @bymariap/storefront dev
```

Ensure `apps/api/.env` has `WOMPI_*` keys (use Wompi sandbox keys). Ensure `apps/api/.env` `ADMIN_ORIGIN` includes `http://localhost:3000`. Ensure DB has demo data (`SEED_DEMO_DATA=true pnpm --filter @bymariap/api prisma:seed`).

- [ ] **Step 2: Walk through the storefront**

In the browser at http://localhost:3000:
1. Header + footer render with Stitch styling.
2. Home shows featured products.
3. `/productos` lists products; clicking a category filter narrows the list.
4. Detail page renders gallery + JSON-LD (View source → confirm `application/ld+json` block).
5. Add 2 units of a product → cart icon shows `2`.
6. `/carrito` shows the row; increase quantity, decrease, remove, re-add.
7. `/checkout` → city default `Medellín` populates shipping options; pick the AM zone; fill guest email/phone; click "Pagar con Wompi".
8. Verify the browser navigates to `checkout.wompi.co/p/?...` with the correct reference + integrity signature.
9. Use the Wompi sandbox test card to complete payment.
10. Wompi redirects back to `/checkout/confirmacion?id=<ref>` → page shows pending, then polls and switches to **Pagado** within ~5s (assuming the API received the webhook).
11. Login as a customer user; visit `/mi-cuenta/pedidos` → the just-paid order appears.
12. `/politica-tratamiento-datos` renders.
13. `/sitemap.xml` returns XML with product URLs.

- [ ] **Step 3: Lighthouse pass on home + product detail**

Run Lighthouse (Chrome DevTools → Lighthouse) on both pages. Capture the SEO + performance scores. SEO should be ≥ 95 (metadata, title, lang, sitemap reachable). Performance is informational only — no required threshold in MVP.

If any defect appears, fix and commit with a clear message before continuing.

- [ ] **Step 4: Final commit if fixes**

```bash
git add -p
git commit -m "fix(storefront): smoke test fixes"
```

---

## Task 19: README + final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Append a Phase 4 section to root `README.md`**

```markdown
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
```

- [ ] **Step 2: Verification suite**

```bash
pnpm --filter @bymariap/api test
pnpm --filter @bymariap/api build
pnpm --filter @bymariap/admin typecheck && pnpm --filter @bymariap/admin build
pnpm --filter @bymariap/storefront typecheck
pnpm --filter @bymariap/storefront build
```

Expected: all green. `next build` must complete without TS / lint errors.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: phase 4 storefront setup + stitch design source"
```

---

## Acceptance criteria (Phase 4)

Visual:
- Every page implemented in this phase visually matches its Stitch screen (header, footer, hero, product card, detail layout, cart row, checkout form, confirmation, login, account). No invented designs.
- Tailwind theme variables, fonts, and radii are driven by the Stitch design system / observed screens documented in `apps/storefront/DESIGN.md`.

Functional:
- Home + catalog + product detail render server-side with `revalidate: 60`; rebuilding `next build` succeeds.
- Product detail emits a valid `Product` JSON-LD with `priceCurrency: COP`.
- Cart icon badge updates after add/update/remove. Guest cart persists across reloads (the `guest_token` cookie set by the API survives the browser session).
- `/checkout` fetches shipping options for the typed city; submitting builds a Wompi redirect URL with the correct integrity signature and navigates to `checkout.wompi.co`.
- After Wompi sandbox payment, the user lands back on `/checkout/confirmacion?id=<ref>`; the page polls and reflects `paid` once the webhook lands.
- `OUT_OF_STOCK` from `POST /store/orders` surfaces a friendly toast pointing the user back to the cart.
- Logged-in user gets profile + orders pages; logout clears cookies and bounces back to `/`.
- `/sitemap.xml` returns all static routes + product pages.
- `/robots.txt` disallows `/carrito`, `/checkout`, `/mi-cuenta`, `/login`.

Code quality:
- `next build` runs clean (no TS errors, no Next lint errors).
- No `any` in component props; DTOs come from `@bymariap/types`.
- No hard-coded localhost URLs in components — only via env vars.

## Out of scope (deferred to later phases)

- Services / availability / appointments storefront (Phase 5)
- Client-record self-service (Phase 6)
- Order email confirmations
- Address book / saved addresses
- Wishlist
- Product reviews
- Multi-language
- Image upload + transformations (admin pastes URLs)
- A/B testing, analytics events instrumentation (Phase 7)
- Push notifications
- Service worker / offline support
