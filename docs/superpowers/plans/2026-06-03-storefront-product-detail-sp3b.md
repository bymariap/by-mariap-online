# SP3b — Detalle de producto (storefront) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinear `/productos/[slug]` con el diseño Stitch: buybox reestilizado, "Completa tu rutina" con productos reales, y las secciones editoriales (¿Cómo usar?, Ingredientes, Reseñas, FAQ) como placeholders skeleton.

**Architecture:** Reestructura de `productos/[slug]/page.tsx` (tipografía buybox + orden de secciones) y dos componentes nuevos: `related-products.tsx` (async server, datos reales) y `product-detail-placeholders.tsx` (secciones skeleton estáticas). Reutiliza `ProductCard` (con quick-add de SP3a).

**Tech Stack:** Next 15 (webpack), React 19, Tailwind 3.4, pnpm, `serverFetch`.

**Spec:** [`docs/superpowers/specs/2026-06-03-storefront-product-detail-sp3b-design.md`](../specs/2026-06-03-storefront-product-detail-sp3b-design.md)

**Convenciones:**
- Comandos desde la raíz del monorepo `C:\Users\Theodoro\Documents\by-mariap-online`; paquete `@bymariap/storefront`.
- **Commits sin** trailer `Co-Authored-By`. **No** convertir line endings a CRLF.
- WIP previo en `apps/admin/*` no relacionado: **no** incluirlo (nombrar archivos exactos en cada `git add`).
- **No** usar `lint` como verificación (roto en el entorno: `next lint` interactivo). Verificar con `typecheck` + `build` + visual.

---

## Task 0: Rama de trabajo

**Files:** —

- [ ] **Step 1: Crear la rama desde main**

Run:
```bash
git checkout -b feat/storefront-product-detail
```
Expected: `Switched to a new branch 'feat/storefront-product-detail'`

---

## Task 1: Secciones placeholder (skeleton)

**Files:**
- Create: `apps/storefront/src/components/product-detail-placeholders.tsx`

- [ ] **Step 1: Crear el componente con las secciones skeleton**

Crear `apps/storefront/src/components/product-detail-placeholders.tsx` con:

```tsx
function Bar({ className }: { className?: string }) {
  return <div className={`bg-muted rounded ${className ?? ""}`} />;
}

export function ProductUsageSections() {
  return (
    <div className="space-y-20 md:space-y-24">
      {/* TODO(backend): pasos de uso del producto */}
      <section>
        <h2 className="t-sub-italic border-l-4 border-accent-container pl-6 mb-8">
          ¿Cómo usar?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Bar className="h-4 w-24" />
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </section>

      {/* TODO(backend): ingredientes clave */}
      <section>
        <h2 className="t-section text-foreground mb-8">Ingredientes Clave</h2>
        <div className="grid md:grid-cols-2 gap-8">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3">
              <Bar className="h-4 w-32" />
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </section>

      {/* TODO(backend): reseñas / experiencias reales */}
      <section>
        <h2 className="t-section italic text-foreground mb-8">
          Experiencias Reales
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="space-y-3 rounded-xl border border-border p-6"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <Bar className="h-3 w-24" />
              </div>
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ProductFaqSection() {
  return (
    <section>
      {/* TODO(backend): preguntas frecuentes */}
      <h2 className="t-section text-foreground mb-6">Preguntas Frecuentes</h2>
      <div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-b border-border py-4">
            <div className="bg-muted rounded h-4 w-2/3" />
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores (exit 0).

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/product-detail-placeholders.tsx
git commit -m "feat(storefront): add product detail skeleton sections (usage/ingredients/reviews/faq)"
```

---

## Task 2: RelatedProducts (relacionados reales)

**Files:**
- Create: `apps/storefront/src/components/related-products.tsx`

- [ ] **Step 1: Crear el componente async de relacionados**

Crear `apps/storefront/src/components/related-products.tsx` con:

```tsx
import { serverFetch } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import { ProductCard } from "@/components/product-card";
import type { ProductDTO } from "@bymariap/types";

export async function RelatedProducts({
  categorySlug,
  excludeId,
}: {
  categorySlug?: string;
  excludeId: string;
}) {
  let products: ProductDTO[] = [];
  try {
    if (categorySlug) {
      products = await serverFetch<ProductDTO[]>(
        `${endpoints.storeProducts}?categorySlug=${encodeURIComponent(categorySlug)}`,
        { next: { revalidate: 60 } },
      );
    }
    if (products.filter((p) => p.id !== excludeId).length === 0) {
      products = await serverFetch<ProductDTO[]>(endpoints.storeProducts, {
        next: { revalidate: 60 },
      });
    }
  } catch {
    return null;
  }

  const related = products.filter((p) => p.id !== excludeId).slice(0, 4);
  if (related.length === 0) return null;

  return (
    <section className="space-y-8">
      <h2 className="t-display text-foreground">Completa tu rutina</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/related-products.tsx
git commit -m "feat(storefront): add RelatedProducts (real same-category products)"
```

---

## Task 3: Reestructurar la página de detalle

**Files:**
- Modify: `apps/storefront/src/app/productos/[slug]/page.tsx` (reemplazo completo)

- [ ] **Step 1: Reemplazar el contenido de `[slug]/page.tsx`**

Reemplazar **todo** `apps/storefront/src/app/productos/[slug]/page.tsx` por:

```tsx
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch, ApiError } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import { productJsonLd } from "@/lib/seo";
import { formatCop } from "@/lib/format";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { RelatedProducts } from "@/components/related-products";
import {
  ProductUsageSections,
  ProductFaqSection,
} from "@/components/product-detail-placeholders";
import type { ProductDTO } from "@bymariap/types";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

async function fetchProduct(slug: string): Promise<ProductDTO | null> {
  try {
    return await serverFetch<ProductDTO>(endpoints.storeProduct(slug), {
      next: { revalidate: 60 },
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await fetchProduct(slug);
  if (!p) return { title: "Producto no encontrado" };
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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const firstCategory = product.categories[0];

  return (
    <article className="container py-10">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd(product, baseUrl)),
        }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 text-xs font-body text-muted-foreground flex gap-1.5">
        <Link
          href="/productos"
          className="hover:text-foreground transition-colors"
        >
          Tienda
        </Link>
        {firstCategory && (
          <>
            <span>/</span>
            <Link
              href={`/productos?categoria=${firstCategory.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {firstCategory.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      {/* Main grid */}
      <div className="grid md:grid-cols-2 gap-12 mb-20 md:mb-24">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-square rounded-md overflow-hidden bg-muted">
            {product.imageUrls[0] ? (
              <Image
                src={product.imageUrls[0]}
                alt={product.name}
                width={900}
                height={900}
                className="h-full w-full object-cover"
                priority
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <span className="text-xs font-body text-muted-foreground">
                  Sin imagen
                </span>
              </div>
            )}
          </div>
          {product.imageUrls.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.imageUrls.slice(1, 5).map((u, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-sm overflow-hidden bg-muted"
                >
                  <Image
                    src={u}
                    alt={`${product.name} ${i + 2}`}
                    width={300}
                    height={300}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buy-box */}
        <div className="space-y-5">
          {product.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.categories.map((c) => (
                <Badge key={c.id}>{c.name}</Badge>
              ))}
            </div>
          )}

          <h1 className="t-display text-foreground leading-tight">
            {product.name}
          </h1>

          <p className="text-2xl font-body font-medium text-foreground">
            {formatCop(product.priceCop)}
          </p>

          {product.description && (
            <p className="text-sm font-body font-light text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}

          <p className="text-xs font-body text-muted-foreground">
            Pickup en El Poblado · Envío express 2–4 h en Medellín
          </p>

          <p className="text-sm font-body text-muted-foreground">
            {product.stockQuantity > 0
              ? `Disponibles: ${product.stockQuantity}`
              : "Agotado"}
          </p>

          {product.stockQuantity > 0 && (
            <AddToCartButton productId={product.id} />
          )}
        </div>
      </div>

      {/* Editorial sections */}
      <div className="space-y-20 md:space-y-24">
        <ProductUsageSections />
        <Suspense fallback={null}>
          <RelatedProducts
            categorySlug={firstCategory?.slug}
            excludeId={product.id}
          />
        </Suspense>
        <ProductFaqSection />
      </div>
    </article>
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
git add "apps/storefront/src/app/productos/[slug]/page.tsx"
git commit -m "feat(storefront): restructure product detail (serif buybox, editorial sections, related)"
```

---

## Task 4: Verificación final (typecheck + build + visual)

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

Abrir un detalle de producto (`http://localhost:3000/productos/<slug>` — usar un slug real del catálogo) y verificar:
- **Buybox**: `h1` en serif **light** (no semibold), descripción en peso ligero; precio, stock y "Añadir al carrito" funcionan.
- **¿Cómo usar?**: heading itálico con borde izquierdo peach + 3 columnas de barras skeleton.
- **Ingredientes Clave** y **Experiencias Reales**: visibles como bloques skeleton (las reseñas con círculo de avatar).
- **Completa tu rutina**: muestra **productos reales** (cards con quick-add en hover); si no hay relacionados, la sección no aparece.
- **Preguntas Frecuentes**: 4 filas skeleton con borde inferior.
- Breadcrumb correcto; sin regresiones.

- [ ] **Step 3: Confirmar estado de git**

Run: `git log --oneline feat/storefront-product-detail -4`
Expected: 3 commits (Tasks 1–3), sin archivos de `apps/admin`.

> No hay commit en esta tarea: solo verificación. La integración de la rama se decide al cerrar SP3b con el usuario.

---

## Notas de cierre

- Al terminar SP3b se cierra SP3 (catálogo + detalle). El detalle queda alineado con Stitch salvo el **contenido real** de uso/ingredientes/reseñas/FAQ (backend) y el split exacto 12-col.
- Cada sección placeholder lleva su `TODO(backend)` para "encenderla" cuando existan los campos.
