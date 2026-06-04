# SP4 — Flujo de compra (storefront) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinear `/carrito`, `/checkout` y `/checkout/confirmacion` con Stitch (tipografía `t-*`, cards `rounded-xl`, token `accent-container`, íconos Material Symbols), enriquecer el carrito vacío y quitar los círculos numerados del checkout.

**Architecture:** Ediciones visuales en las 3 páginas del flujo (lógica de cart/Wompi/react-query intacta) + un componente nuevo `empty-cart-suggestions.tsx` (client, fetch de categorías). Migración incremental de los íconos de los archivos tocados.

**Tech Stack:** Next 15 (webpack), React 19, Tailwind 3.4, pnpm, `@tanstack/react-query`, `@material-symbols/svg-300` + SVGR.

**Spec:** [`docs/superpowers/specs/2026-06-03-storefront-checkout-flow-sp4-design.md`](../specs/2026-06-03-storefront-checkout-flow-sp4-design.md)

**Convenciones:**
- Comandos desde la raíz del monorepo `C:\Users\Theodoro\Documents\by-mariap-online`; paquete `@bymariap/storefront`.
- **Commits sin** trailer `Co-Authored-By`. **No** convertir line endings a CRLF.
- WIP previo en `apps/admin/*` no relacionado: **no** incluirlo (nombrar archivos exactos en cada `git add`).
- **No** usar `lint` como verificación (roto en el entorno). Verificar con `typecheck` + `build` + visual.

---

## Task 0: Rama de trabajo

**Files:** —

- [ ] **Step 1: Crear la rama desde main**

Run:
```bash
git checkout -b feat/storefront-checkout-flow
```
Expected: `Switched to a new branch 'feat/storefront-checkout-flow'`

---

## Task 1: EmptyCartSuggestions (client)

**Files:**
- Create: `apps/storefront/src/components/empty-cart-suggestions.tsx`

- [ ] **Step 1: Crear el componente de sugerencias del carrito vacío**

Crear `apps/storefront/src/components/empty-cart-suggestions.tsx` con:

```tsx
"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { CategoryDTO } from "@bymariap/types";

export function EmptyCartSuggestions() {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<CategoryDTO[]>(endpoints.storeCategories),
  });

  if (!categories || categories.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
      {categories.slice(0, 3).map((c) => (
        <Link
          key={c.id}
          href={`/productos?categoria=${c.slug}`}
          className="group block text-center"
        >
          {/* TODO(asset): imagen de categoría */}
          <div className="aspect-[4/5] bg-muted rounded-xl" />
          <p className="font-heading italic text-lg text-foreground mt-3">
            {c.name}
          </p>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores (exit 0).

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/empty-cart-suggestions.tsx
git commit -m "feat(storefront): add EmptyCartSuggestions (category cards for empty cart)"
```

---

## Task 2: Carrito (reemplazo completo)

**Files:**
- Modify: `apps/storefront/src/app/carrito/page.tsx` (reemplazo completo)

- [ ] **Step 1: Reemplazar el contenido de `carrito/page.tsx`**

Reemplazar **todo** `apps/storefront/src/app/carrito/page.tsx` por:

```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import Delete from "@material-symbols/svg-300/outlined/delete.svg?react";
import VerifiedUser from "@material-symbols/svg-300/outlined/verified_user.svg?react";
import {
  useCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from "@/lib/cart/hooks";
import { QuantityInput } from "@/components/quantity-input";
import { Separator } from "@/components/ui/separator";
import { EmptyCartSuggestions } from "@/components/empty-cart-suggestions";
import { formatCop } from "@/lib/format";

export default function CartPage() {
  const cart = useCart();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();

  if (cart.isLoading) {
    return (
      <div className="container py-20 text-center">
        <p className="text-sm font-body text-muted-foreground">
          Cargando carrito…
        </p>
      </div>
    );
  }

  if (!cart.data || cart.data.items.length === 0) {
    return (
      <div className="container py-24 space-y-16">
        <div className="max-w-md mx-auto text-center space-y-6">
          <h1 className="t-display text-foreground">Tu carrito está vacío</h1>
          <p className="text-sm font-body text-muted-foreground leading-relaxed">
            Descubre nuestra colección de productos para el cuidado de tus cejas.
          </p>
          <Link
            href="/productos"
            className="inline-flex h-12 px-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Ver productos
          </Link>
        </div>
        <EmptyCartSuggestions />
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="t-display text-foreground mb-8">Tu carrito</h1>

      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* ── Product list ── */}
        <div className="flex-1">
          {cart.data.items.map((item, idx) => (
            <div key={item.id}>
              {idx > 0 && <Separator className="my-0" />}
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
            </div>
          ))}
        </div>

        {/* ── Summary card ── */}
        <aside className="w-full lg:w-80 shrink-0 lg:sticky lg:top-24">
          <div
            className="bg-white rounded-xl p-6 space-y-4"
            style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
          >
            <h2 className="t-section text-foreground">Resumen</h2>

            <div className="flex justify-between text-sm font-body">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground font-medium">
                {formatCop(cart.data.subtotal)}
              </span>
            </div>

            <div className="flex justify-between text-sm font-body gap-4">
              <span className="text-muted-foreground shrink-0">Envío</span>
              <span className="text-muted-foreground text-right text-xs">
                El envío se calcula en el siguiente paso.
              </span>
            </div>

            <Separator />

            <div className="flex justify-between font-body">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="text-base font-semibold text-foreground">
                {formatCop(cart.data.subtotal)}
              </span>
            </div>

            <Link
              href="/checkout"
              className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Ir a pagar
            </Link>

            <div className="text-center">
              <Link
                href="/productos"
                className="text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
              >
                Seguir comprando
              </Link>
            </div>

            {/* Envío seguro note */}
            <div className="flex items-start gap-2.5 rounded-md p-3 bg-accent-container">
              <VerifiedUser className="h-4 w-4 shrink-0 text-foreground mt-0.5" />
              <div>
                <p className="text-xs font-body font-medium text-foreground">
                  Envío Seguro & Premium
                </p>
                <p className="text-xs font-body text-muted-foreground mt-0.5">
                  Cada pedido es preparado con cuidado artesanal en Medellín.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/app/carrito/page.tsx
git commit -m "feat(storefront): restyle cart (serif headings, rounded-xl, accent-container, MS icons, empty suggestions)"
```

---

## Task 3: Checkout (ediciones puntuales)

**Files:**
- Modify: `apps/storefront/src/app/checkout/page.tsx`

> Cada paso es un reemplazo exacto de un fragmento; la lógica del formulario no se toca.

- [ ] **Step 1: Título principal a `t-display`**

Reemplazar:
```tsx
      <h1 className="font-heading text-3xl font-semibold text-foreground mb-8">
        Finalizar Compra
      </h1>
```
por:
```tsx
      <h1 className="t-display text-foreground mb-8">Finalizar Compra</h1>
```

- [ ] **Step 2: Quitar el círculo numerado de la sección 1**

Reemplazar:
```tsx
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-body">
                1
              </span>
              Identificación y Entrega
            </h2>
```
por:
```tsx
            <h2 className="t-section text-foreground">Identificación y Entrega</h2>
```

- [ ] **Step 3: Quitar el círculo numerado de la sección 2**

Reemplazar:
```tsx
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-body">
                2
              </span>
              Método de Envío
            </h2>
```
por:
```tsx
            <h2 className="t-section text-foreground">Método de Envío</h2>
```

- [ ] **Step 4: CTA de pago en mayúsculas**

Reemplazar:
```tsx
            className="w-full h-12 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
```
por:
```tsx
            className="w-full h-12 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
```

- [ ] **Step 5: Card del resumen a `rounded-xl`**

Reemplazar:
```tsx
          <div
            className="bg-white rounded-md p-6 space-y-4"
            style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
          >
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Resumen de Orden
            </h2>
```
por:
```tsx
          <div
            className="bg-white rounded-xl p-6 space-y-4"
            style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
          >
            <h2 className="t-section text-foreground">Resumen de Orden</h2>
```

- [ ] **Step 6: Verificar typecheck y commit**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

```bash
git add apps/storefront/src/app/checkout/page.tsx
git commit -m "feat(storefront): restyle checkout (serif headings, no numbered circles, rounded-xl, uppercase CTA)"
```

---

## Task 4: Confirmación (ediciones puntuales)

**Files:**
- Modify: `apps/storefront/src/app/checkout/confirmacion/page.tsx`

- [ ] **Step 1: Migrar imports de íconos**

Reemplazar:
```tsx
import { CheckCircle, Clock } from "lucide-react";
```
por:
```tsx
import CheckCircle from "@material-symbols/svg-300/outlined/check_circle.svg?react";
import Schedule from "@material-symbols/svg-300/outlined/schedule.svg?react";
```

- [ ] **Step 2: Usar los íconos Material Symbols**

Reemplazar:
```tsx
        {isPending ? (
          <Clock
            className="h-14 w-14 mx-auto text-muted-foreground"
            strokeWidth={1.5}
          />
        ) : (
          <CheckCircle
            className="h-14 w-14 mx-auto text-foreground"
            strokeWidth={1.5}
          />
        )}
```
por:
```tsx
        {isPending ? (
          <Schedule className="h-14 w-14 mx-auto text-muted-foreground" />
        ) : (
          <CheckCircle className="h-14 w-14 mx-auto text-foreground" />
        )}
```

- [ ] **Step 3: Título a `t-display`**

Reemplazar:
```tsx
        <h1 className="font-heading text-3xl font-semibold text-foreground">
```
por:
```tsx
        <h1 className="t-display text-foreground">
```

- [ ] **Step 4: Card "Resumen de tu pedido" a `rounded-xl` + heading**

Reemplazar:
```tsx
        <div
          className="bg-white rounded-md p-5 space-y-3"
          style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
        >
          <h2 className="font-heading text-base font-semibold text-foreground">
            Resumen de tu pedido
          </h2>
```
por:
```tsx
        <div
          className="bg-white rounded-xl p-5 space-y-3"
          style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
        >
          <h2 className="font-heading text-lg text-foreground">
            Resumen de tu pedido
          </h2>
```

- [ ] **Step 5: Card "Dirección de Entrega" a `rounded-xl` + heading**

Reemplazar:
```tsx
        <div
          className="bg-white rounded-md p-5 space-y-2"
          style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
        >
          <h2 className="font-heading text-base font-semibold text-foreground">
            Dirección de Entrega
          </h2>
```
por:
```tsx
        <div
          className="bg-white rounded-xl p-5 space-y-2"
          style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
        >
          <h2 className="font-heading text-lg text-foreground">
            Dirección de Entrega
          </h2>
```

- [ ] **Step 6: Verificar typecheck/build y commit**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

Run: `pnpm --filter @bymariap/storefront build`
Expected: build exitoso.

```bash
git add apps/storefront/src/app/checkout/confirmacion/page.tsx
git commit -m "feat(storefront): restyle confirmation (serif headings, rounded-xl, MS icons)"
```

---

## Task 5: Verificación final (typecheck + build + visual)

**Files:** —

- [ ] **Step 1: Typecheck y build**

Run:
```bash
pnpm --filter @bymariap/storefront typecheck
pnpm --filter @bymariap/storefront build
```
Expected: ambos en verde (exit 0).

- [ ] **Step 2: Revisión visual manual**

Run: `pnpm --filter @bymariap/storefront dev`

Verificar en `http://localhost:3000`:
- **`/carrito` (con items):** `h1` "Tu carrito" y "Resumen" en serif light; card de resumen `rounded-xl`; caja "Envío Seguro" en peach (token `accent-container`); íconos de eliminar (papelera) y escudo en Material Symbols; sumar/restar/eliminar y "Ir a pagar" funcionan.
- **`/carrito` (vacío):** título serif + 3 cards de categoría (placeholder + nombre itálico) que navegan a `/productos?categoria=…`.
- **`/checkout`:** **sin** círculos numerados; headings serif; CTA "Pagar con Wompi" en mayúsculas; cards `rounded-xl`; el flujo a Wompi funciona (o muestra error controlado si la API no responde).
- **`/checkout/confirmacion?id=<ref>`:** `h1` serif light; cards `rounded-xl`; íconos Material Symbols (check / reloj); pill de estado tonal.

- [ ] **Step 3: Confirmar estado de git**

Run: `git log --oneline feat/storefront-checkout-flow -6`
Expected: 4 commits (Tasks 1–4), sin archivos de `apps/admin`.

> No hay commit en esta tarea: solo verificación. La integración de la rama se decide al cerrar SP4 con el usuario.

---

## Notas de cierre

- Al terminar SP4, el flujo de compra queda alineado con Stitch salvo imágenes reales de las category cards (placeholder D4) y el flujo de pago propio (Wompi redirect, V1 — divergencia intencional).
- Quedaría **SP5** (Cuenta + Booking) para cerrar el roadmap.
