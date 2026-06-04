# SP3a — Catálogo (storefront) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinear `/productos` con el diseño Stitch: sidebar de 3 filtros, encabezado dinámico por categoría, grid 4-up y `ProductCard` con botón de agregar al carrito en hover.

**Architecture:** Cambios en `productos/page.tsx` (título dinámico, grid, sidebar) + `category-filter.tsx` (heading serif), y dos componentes nuevos: `catalog-filters-placeholder.tsx` (Objetivo/Precio inertes, server) y `quick-add-button.tsx` (overlay client con `useAddToCart`). `ProductCard` se reestructura para alojar el overlay sin anidar `<button>` en `<a>`.

**Tech Stack:** Next 15 (webpack), React 19, Tailwind 3.4, pnpm, `@tanstack/react-query` (hook `useAddToCart`), `sonner`.

**Spec:** [`docs/superpowers/specs/2026-06-03-storefront-catalog-sp3a-design.md`](../specs/2026-06-03-storefront-catalog-sp3a-design.md)

**Convenciones:**
- Comandos desde la raíz del monorepo `C:\Users\Theodoro\Documents\by-mariap-online`; paquete `@bymariap/storefront`.
- **Commits sin** trailer `Co-Authored-By`. **No** convertir line endings a CRLF.
- WIP previo en `apps/admin/*` no relacionado: **no** incluirlo (nombrar archivos exactos en cada `git add`).
- **Nota de verificación:** el script `pnpm … lint` está roto en este entorno (el `next lint` deprecado entra en modo interactivo y sale con código 1). **No** se usa `lint` como verificación; se usa `typecheck` + `build` + visual.

---

## Task 0: Rama de trabajo

**Files:** —

- [ ] **Step 1: Crear la rama desde main**

Run:
```bash
git checkout -b feat/storefront-catalog
```
Expected: `Switched to a new branch 'feat/storefront-catalog'`

---

## Task 1: Heading serif en CategoryFilter

**Files:**
- Modify: `apps/storefront/src/components/category-filter.tsx:22-25`

- [ ] **Step 1: Cambiar el heading "Categorías" a serif**

En `apps/storefront/src/components/category-filter.tsx`, reemplazar el `<p>` del título del grupo:

```tsx
      <p className="text-xs font-body font-medium uppercase tracking-wide text-muted-foreground mb-3">
        Categorías
      </p>
```
por:
```tsx
      <p className="font-heading text-lg text-foreground mb-3">Categorías</p>
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores (exit 0).

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/category-filter.tsx
git commit -m "feat(storefront): serif heading for Categorías filter group"
```

---

## Task 2: Filtros placeholder (Objetivo + Precio)

**Files:**
- Create: `apps/storefront/src/components/catalog-filters-placeholder.tsx`

- [ ] **Step 1: Crear el componente estático de filtros placeholder**

Crear `apps/storefront/src/components/catalog-filters-placeholder.tsx` con:

```tsx
const objetivos = ["Crecimiento", "Definición", "Hidratación"];

export function CatalogFiltersPlaceholder() {
  return (
    <div className="mt-8 space-y-8">
      {/* TODO(backend): filtro por objetivo (no existe el atributo en el modelo) */}
      <div className="space-y-3">
        <p className="font-heading text-lg text-foreground">Objetivo</p>
        <div className="space-y-2 opacity-60">
          {objetivos.map((o) => (
            <label
              key={o}
              className="flex items-center gap-2 text-sm font-body text-muted-foreground cursor-not-allowed"
            >
              <input type="checkbox" disabled className="accent-primary" />
              {o}
            </label>
          ))}
        </div>
      </div>

      {/* TODO(backend): filtro por precio (el filtrado debe hacerse en backend) */}
      <div className="space-y-3">
        <p className="font-heading text-lg text-foreground">Precio</p>
        <div className="space-y-2 opacity-60">
          <input
            type="range"
            disabled
            className="w-full accent-primary cursor-not-allowed"
          />
          <div className="flex justify-between text-xs font-body text-muted-foreground">
            <span>$0</span>
            <span>$500.000</span>
          </div>
        </div>
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
git add apps/storefront/src/components/catalog-filters-placeholder.tsx
git commit -m "feat(storefront): add placeholder Objetivo/Precio catalog filters"
```

---

## Task 3: QuickAddButton (client)

**Files:**
- Create: `apps/storefront/src/components/quick-add-button.tsx`

- [ ] **Step 1: Crear el botón de quick-add**

Crear `apps/storefront/src/components/quick-add-button.tsx` con:

```tsx
"use client";

import { toast } from "sonner";
import { useAddToCart } from "@/lib/cart/hooks";
import { cn } from "@/lib/cn";

export function QuickAddButton({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const mut = useAddToCart();

  return (
    <button
      type="button"
      disabled={mut.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        mut.mutate(
          { productId, quantity: 1 },
          {
            onSuccess: () => toast.success("Agregado al carrito"),
            onError: (err: unknown) =>
              toast.error(
                (err as { message?: string })?.message ?? "No se pudo agregar",
              ),
          },
        );
      }}
      className={cn(
        "bg-surface/90 backdrop-blur py-2.5 rounded-full text-xs font-body font-medium uppercase tracking-widest text-foreground hover:bg-surface transition-colors disabled:opacity-50",
        className,
      )}
    >
      {mut.isPending ? "Agregando…" : "Añadir"}
    </button>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores (valida que `useAddToCart` y su firma `mutate({ productId, quantity })` existen).

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/quick-add-button.tsx
git commit -m "feat(storefront): add QuickAddButton client component"
```

---

## Task 4: Reestructurar ProductCard con el overlay

**Files:**
- Modify: `apps/storefront/src/components/product-card.tsx` (reemplazo completo)

- [ ] **Step 1: Reemplazar el contenido de `product-card.tsx`**

Reemplazar **todo** `apps/storefront/src/components/product-card.tsx` por:

```tsx
import Link from "next/link";
import Image from "next/image";
import type { ProductDTO } from "@bymariap/types";
import { formatCop } from "@/lib/format";
import { QuickAddButton } from "@/components/quick-add-button";

export function ProductCard({ product }: { product: ProductDTO }) {
  const img = product.imageUrls[0];
  const href = `/productos/${product.slug}`;
  return (
    <div className="group">
      <div className="relative aspect-square rounded-sm overflow-hidden bg-muted">
        <Link href={href} className="block h-full w-full">
          {img ? (
            <Image
              src={img}
              alt={product.name}
              width={600}
              height={600}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="h-full w-full bg-surface flex items-center justify-center">
              <span className="text-xs font-body text-muted-foreground">
                Sin imagen
              </span>
            </div>
          )}
        </Link>
        {product.stockQuantity > 0 && (
          <QuickAddButton
            productId={product.id}
            className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
      </div>
      <Link href={href} className="mt-3 block space-y-0.5">
        <h3 className="t-card text-foreground">{product.name}</h3>
        <p className="text-sm font-body text-muted-foreground">
          {formatCop(product.priceCop)}
        </p>
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/product-card.tsx
git commit -m "feat(storefront): ProductCard hover quick-add overlay"
```

---

## Task 5: Página de catálogo (título dinámico, grid 4-up, sidebar)

**Files:**
- Modify: `apps/storefront/src/app/productos/page.tsx`

- [ ] **Step 1: Reemplazar el contenido de `productos/page.tsx`**

Reemplazar **todo** `apps/storefront/src/app/productos/page.tsx` por:

```tsx
import { Suspense } from "react";
import { serverFetch } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import { ProductCard } from "@/components/product-card";
import { CategoryFilter } from "@/components/category-filter";
import { CatalogFiltersPlaceholder } from "@/components/catalog-filters-placeholder";
import type { CategoryDTO, ProductDTO } from "@bymariap/types";

export const revalidate = 60;

export const metadata = { title: "Tienda" };

interface PageProps {
  searchParams: Promise<{ categoria?: string }>;
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const { categoria } = await searchParams;

  const productsPath = categoria
    ? `${endpoints.storeProducts}?categorySlug=${encodeURIComponent(categoria)}`
    : endpoints.storeProducts;

  let products: ProductDTO[] = [];
  let categories: CategoryDTO[] = [];

  try {
    [products, categories] = await Promise.all([
      serverFetch<ProductDTO[]>(productsPath, { next: { revalidate: 60 } }),
      serverFetch<CategoryDTO[]>(endpoints.storeCategories, {
        next: { revalidate: 300 },
      }),
    ]);
  } catch {
    // API unavailable at build time — render empty state
  }

  const activeCategory = categories.find((c) => c.slug === categoria);
  const title = activeCategory?.name ?? "Colección de Cuidado";

  return (
    <>
      {/* Promo banner */}
      <div className="bg-muted border-b-0 py-2 text-center">
        <p className="text-xs font-body text-muted-foreground">
          Envío gratis en Medellín por compras superiores a $150.000
        </p>
      </div>

      <div className="container py-10">
        <div className="flex gap-10">
          {/* Sidebar */}
          <aside className="hidden md:block w-52 shrink-0">
            <Suspense fallback={null}>
              <CategoryFilter categories={categories} />
            </Suspense>
            <CatalogFiltersPlaceholder />
          </aside>

          {/* Main content */}
          <div className="flex-1 space-y-6">
            <div>
              <h1 className="t-section text-foreground">{title}</h1>
              <p className="mt-1 text-sm font-body font-light text-muted-foreground">
                {products.length} producto{products.length !== 1 ? "s" : ""}{" "}
                encontrado{products.length !== 1 ? "s" : ""}
              </p>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <p className="text-sm font-body text-muted-foreground py-12 text-center">
                No hay productos en esta categoría.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verificar typecheck y build**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

Run: `pnpm --filter @bymariap/storefront build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/app/productos/page.tsx
git commit -m "feat(storefront): catalog dynamic title, 4-up grid, placeholder filters in sidebar"
```

---

## Task 6: Verificación final (typecheck + build + visual)

**Files:** —

- [ ] **Step 1: Typecheck y build**

Run:
```bash
pnpm --filter @bymariap/storefront typecheck
pnpm --filter @bymariap/storefront build
```
Expected: ambos en verde (exit 0). (Se omite `lint` por el problema de entorno descrito arriba.)

- [ ] **Step 2: Revisión visual manual**

Run: `pnpm --filter @bymariap/storefront dev`

Abrir `http://localhost:3000/productos` y verificar:
- **Sidebar**: "Categorías" con heading serif y links funcionales; debajo "Objetivo" (3 checkboxes inertes) y "Precio" (slider inerte), visiblemente atenuados.
- **Encabezado**: muestra "Colección de Cuidado" sin filtro; al hacer clic en una categoría, el `h1` cambia al **nombre de esa categoría** y el listado se filtra.
- **Grid**: 4 columnas en desktop.
- **Hover** sobre una card: aparece el botón "Añadir"; al hacer clic agrega al carrito (sube el badge del header, toast "Agregado al carrito") y **no** navega al detalle. Cards sin stock no muestran el botón.
- Click en la imagen o el nombre → navega al detalle del producto.

- [ ] **Step 3: Confirmar estado de git**

Run: `git log --oneline feat/storefront-catalog -6`
Expected: 5 commits (Tasks 1–5), sin archivos de `apps/admin`.

> No hay commit en esta tarea: solo verificación. La integración de la rama se decide al cerrar SP3a con el usuario.

---

## Notas de cierre

- Al terminar SP3a, el catálogo queda alineado con Stitch salvo el **filtrado real** por Objetivo/Precio (backend) — los filtros están maquetados e inertes con `TODO(backend)`.
- `ProductCard` queda con el quick-add, listo para reutilizarse en la sección "Completa tu rutina" de **SP3b (Detalle)**.
