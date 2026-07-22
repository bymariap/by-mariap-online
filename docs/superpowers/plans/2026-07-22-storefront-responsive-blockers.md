# Storefront Responsive Blockers — Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the three mobile-only Blockers found in the storefront responsive audit: (B1) the header nav vanishes on mobile with no menu, (B2) the home "Nuestras transformaciones" header row overflows horizontally, (B3) the cart line-item row overflows horizontally.

**Architecture:** All three are layout/CSS fixes plus one small new client component. B1 adds a `MobileNav` client component (hamburger + slide-in drawer) rendered by the existing server-component `Header`. B2 and B3 change flex rows to stack on mobile and become single rows at the `sm`/`md` breakpoint. No API, data, or business-logic changes.

**Tech Stack:** Next.js App Router (React Server + Client Components), Tailwind CSS, `lucide-react` icons. Storefront package: `@bymariap/storefront`.

## Global Constraints

- Package: `@bymariap/storefront`. Build/verify: `pnpm --filter @bymariap/storefront build`.
- **No unit-test harness exists in the storefront.** Verification per task = build passes; final visual verification = no horizontal overflow at 375px on the affected pages. Do NOT invent a test framework.
- **Line endings:** do NOT convert files to CRLF (user handles manually).
- **Commit messages:** single concise line, conventional-commit format, NO `Co-Authored-By` trailer.
- Tailwind breakpoints in use: `sm` (640px), `md` (768px). The desktop nav appears at `md:flex`; the mobile menu must therefore be shown only below `md` (`md:hidden`).
- Icons: use `lucide-react` (already a dependency — see `quantity-input.tsx` which imports `Minus`/`Plus` from it).
- Only touch the three files named per task. Do not restructure unrelated code.

---

### Task 1: Mobile navigation menu (Blocker B1)

**Files:**
- Create: `apps/storefront/src/components/mobile-nav.tsx`
- Modify: `apps/storefront/src/components/header.tsx`

**Interfaces:**
- Produces: `MobileNav` — a client component: `function MobileNav({ navLinks }: { navLinks: { label: string; href: string }[] }): JSX.Element`. Renders a hamburger button (visible `< md`) that opens a slide-in drawer listing `navLinks`; closes on link click, on close-button click, and on backdrop click.
- Consumes: the existing `navLinks` array already defined in `header.tsx` (passed as a prop — one source of truth).

- [ ] **Step 1: Create the `MobileNav` client component**

Create `apps/storefront/src/components/mobile-nav.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

interface NavLink {
  label: string;
  href: string;
}

export function MobileNav({ navLinks }: { navLinks: NavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="p-1 text-foreground hover:text-muted-foreground transition-colors"
      >
        <Menu className="h-6 w-6" strokeWidth={1.5} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav className="absolute top-0 right-0 h-full w-72 max-w-[80%] bg-background shadow-xl p-6 flex flex-col">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="self-end p-1 mb-6 text-foreground hover:text-muted-foreground transition-colors"
            >
              <X className="h-6 w-6" strokeWidth={1.5} />
            </button>
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-3 font-body text-base text-foreground hover:text-muted-foreground transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Render `MobileNav` in the header**

In `apps/storefront/src/components/header.tsx`, add the import at the top (after the existing imports):

```tsx
import { MobileNav } from "./mobile-nav";
```

Then, inside the actions `<div className="flex items-center gap-4">` block, add `<MobileNav navLinks={navLinks} />` as the **last** child (after `<CartIconButton />`). The block becomes:

```tsx
        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            href="/mi-cuenta"
            aria-label="Mi cuenta"
            className="p-1 text-foreground hover:text-muted-foreground transition-colors"
          >
            <Person className="h-5 w-5" />
          </Link>
          <CartIconButton />
          <MobileNav navLinks={navLinks} />
        </div>
```

(The existing desktop `<nav className="hidden md:flex ...">` stays unchanged — it handles `md+`, and `MobileNav` handles `< md`.)

- [ ] **Step 3: Verify the build passes**

Run: `pnpm --filter @bymariap/storefront build`
Expected: builds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/components/mobile-nav.tsx apps/storefront/src/components/header.tsx
git commit -m "fix(storefront): add mobile nav menu (hamburger drawer) below md"
```

---

### Task 2: Home "Nuestras transformaciones" header wraps on mobile (Blocker B2)

**Files:**
- Modify: `apps/storefront/src/app/page.tsx` (the galería section header row, currently line ~93)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Make the header row stack on mobile, row on `sm+`**

In `apps/storefront/src/app/page.tsx`, find this row inside the `#galeria` section:

```tsx
          <div className="flex items-end justify-between gap-6">
```

Replace it with:

```tsx
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
```

(Everything inside — the heading block and the `Ver Galería Completa →` link with its `shrink-0` — stays unchanged. On mobile the heading and link now stack vertically; at `sm+` they return to the original side-by-side row.)

- [ ] **Step 2: Verify the build passes**

Run: `pnpm --filter @bymariap/storefront build`
Expected: builds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/app/page.tsx
git commit -m "fix(storefront): wrap galería header row on mobile to stop overflow"
```

---

### Task 3: Cart line-item row stacks controls on mobile (Blocker B3)

**Files:**
- Modify: `apps/storefront/src/app/carrito/page.tsx` (the line-item row, currently lines ~62-110)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Restructure the line-item row so controls drop below the name on mobile**

In `apps/storefront/src/app/carrito/page.tsx`, find the item row that currently reads:

```tsx
              <div className="py-5 flex items-center gap-4">
                {/* Thumbnail */}
                <div className="h-16 w-16 shrink-0 rounded-sm overflow-hidden bg-muted">
                  {item.productImageUrl ? (
                    <Image
                      src={item.productImageUrl}
                      alt={item.productName}
                      width={120}
                      height={120}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-surface" />
                  )}
                </div>

                {/* Name + unit price */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/productos/${item.productSlug}`}
                    className="text-sm font-body font-medium text-foreground hover:underline line-clamp-2"
                  >
                    {item.productName}
                  </Link>
                  <p className="text-xs font-body text-muted-foreground mt-0.5">
                    {formatCop(item.unitPriceSnapshot)} c/u
                  </p>
                </div>

                {/* Qty stepper */}
                <QuantityInput
                  value={item.quantity}
                  onChange={(q) => update.mutate({ id: item.id, quantity: q })}
                />

                {/* Line total */}
                <p className="w-20 text-right text-sm font-body font-medium text-foreground shrink-0">
                  {formatCop(item.lineTotal)}
                </p>

                {/* Delete */}
                <button
                  onClick={() => remove.mutate(item.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  aria-label={`Eliminar ${item.productName}`}
                >
                  <Delete className="h-4 w-4" />
                </button>
              </div>
```

Replace that entire row with this version (thumbnail unchanged; name + a controls cluster now sit in a wrapper that is a column on mobile and a row at `sm+`):

```tsx
              <div className="py-5 flex items-start gap-4">
                {/* Thumbnail */}
                <div className="h-16 w-16 shrink-0 rounded-sm overflow-hidden bg-muted">
                  {item.productImageUrl ? (
                    <Image
                      src={item.productImageUrl}
                      alt={item.productName}
                      width={120}
                      height={120}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-surface" />
                  )}
                </div>

                {/* Name + controls */}
                <div className="flex-1 min-w-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  {/* Name + unit price */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/productos/${item.productSlug}`}
                      className="text-sm font-body font-medium text-foreground hover:underline line-clamp-2"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs font-body text-muted-foreground mt-0.5">
                      {formatCop(item.unitPriceSnapshot)} c/u
                    </p>
                  </div>

                  {/* Controls cluster: qty + line total + delete */}
                  <div className="flex items-center gap-4 shrink-0">
                    <QuantityInput
                      value={item.quantity}
                      onChange={(q) =>
                        update.mutate({ id: item.id, quantity: q })
                      }
                    />
                    <p className="w-20 text-right text-sm font-body font-medium text-foreground shrink-0">
                      {formatCop(item.lineTotal)}
                    </p>
                    <button
                      onClick={() => remove.mutate(item.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      aria-label={`Eliminar ${item.productName}`}
                    >
                      <Delete className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
```

(Key changes: outer row is now `items-start` so the thumbnail aligns to the top when the right side stacks; the name and the controls cluster are wrapped in a `flex flex-col … sm:flex-row` container so on mobile the controls drop onto a second line, and at `sm+` everything is back on one row as before.)

- [ ] **Step 2: Verify the build passes**

Run: `pnpm --filter @bymariap/storefront build`
Expected: builds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/app/carrito/page.tsx
git commit -m "fix(storefront): stack cart line-item controls on mobile to stop overflow"
```

---

### Task 4: Visual verification at 375px (all three fixes)

**Files:** none (verification only). This is the reviewer gate confirming the blockers are actually resolved on a running site.

**Context:** The storefront has no unit tests, so this task confirms the fixes visually. It runs after the three code tasks are deployed (production auto-deploys on push to `main`, or use a Vercel preview). If verifying locally instead, the storefront dev server needs the API reachable for cart/product data.

- [ ] **Step 1: Confirm no horizontal overflow on Home at 375px**

Load the deployed Home at a 375px-wide viewport (real browser devtools responsive mode, or Playwright). In the console run:

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
```

Expected: `true` (was `false` / overflow ~128px before the fix). Visually confirm the "Nuestras transformaciones" heading and "Ver Galería Completa →" link stack vertically with no sideways scroll.

- [ ] **Step 2: Confirm the mobile menu works at 375px**

On any storefront page at 375px: a hamburger icon is visible in the header. Tapping it opens a drawer listing Inicio, Tienda, Servicios, Galería, Nosotros, Contacto. Tapping a link navigates and closes the drawer; tapping the ✕ or the backdrop closes it. At ≥768px the hamburger is hidden and the normal inline nav shows.

- [ ] **Step 3: Confirm no horizontal overflow on Cart at 375px (with an item)**

Add a product to the cart, load `/carrito` at 375px, and run the same overflow check:

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
```

Expected: `true` (was `false` / overflow ~44px before). Visually confirm the product name is on its own line with the quantity stepper, line total, and delete button on a second line, all within the viewport.

- [ ] **Step 4: (No commit)** — verification only.

## Notes for the implementer

- Out of scope (do not touch): the auth-gated account pages (`/mi-cuenta*`), the hero background image `TODO(asset)`, and the product-detail placeholder sections. Those are separate concerns noted in the audit report.
- The desktop (`md+`) and tablet layouts already pass the audit — every change here must leave the `sm`/`md`+ rendering identical to today. The added breakpoints (`sm:flex-row`, `md:hidden`, `md:flex`) preserve the existing wide-screen layout.
