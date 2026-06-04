# Spec — SP3b: Detalle de producto (`/productos/[slug]`)

- **Fecha:** 2026-06-03
- **Tipo:** Diseño/spec (brainstorming). Implementación posterior vía plan.
- **Relacionado:** [Auditoría](../audits/2026-06-01-storefront-design-audit.md) (3.3) · [Decisiones](../audits/2026-06-01-storefront-design-decisions.md) · [SP3a spec](./2026-06-03-storefront-catalog-sp3a-design.md)
- **Depende de:** SP1, SP1.1, SP2, SP3a (en `main`). Reutiliza `ProductCard` (con quick-add de SP3a).

## 1. Contexto y objetivo

Alinear la página de detalle (`apps/storefront/src/app/productos/[slug]/page.tsx`) con el diseño Stitch "Detalle Producto": buybox reestilizado + las secciones editoriales (¿Cómo usar?, Ingredientes, Reseñas, "Completa tu rutina", FAQ). Cierra SP3 (junto con SP3a).

`ProductDTO` solo expone: nombre, descripción, precio, stock, imágenes, categorías. **No** hay campos de uso/ingredientes/reseñas/FAQ → esas secciones son placeholder. "Completa tu rutina" (relacionados) **sí** usa datos reales (otros productos de la API).

## 2. Decisiones aplicadas

- **Secciones sin datos (¿Cómo usar?, Ingredientes, Reseñas, FAQ): placeholders visibles (skeleton).** Se renderiza la estructura con bloques neutros `bg-muted` + `TODO(backend)`, **sin texto de producto inventado**. Los headings de sección sí se muestran (son rótulos del diseño).
- **"Completa tu rutina": relacionados reales.** Otros productos de la misma categoría (fallback: cualquier producto), excluyendo el actual, hasta 4. Si no hay, la sección no se renderiza.
- **Naming Opción A; tokens y `t-*` de SP1/SP1.1.**

## 3. Diseño

Archivos: `productos/[slug]/page.tsx` (reestructura), nuevos `related-products.tsx` y `product-detail-placeholders.tsx`.

### A. Galería + Buybox (real, reestilizar)
En `page.tsx` (se mantiene el fetch, JSON-LD y breadcrumb actuales):
- Galería 2-col (`grid md:grid-cols-2 gap-12`) sin cambios estructurales.
- Buybox:
  - Badges: se mantienen (`<Badge>`); opcionalmente `variant="accent"` para el primero — **dejar `default`** por simplicidad (sin cambio).
  - `h1`: de `font-heading text-3xl md:text-4xl font-semibold` → **`t-display text-foreground leading-tight`**.
  - Precio: `text-2xl font-body font-medium text-foreground` (se mantiene).
  - Descripción: añadir `font-light` (`text-sm font-body font-light text-muted-foreground leading-relaxed whitespace-pre-line`).
  - Pickup, stock y `AddToCartButton`: sin cambios.

### B. `RelatedProducts` (async server, real)
Nuevo `apps/storefront/src/components/related-products.tsx`:
- Props: `{ categorySlug?: string; excludeId: string }`.
- Hace `serverFetch<ProductDTO[]>` a `endpoints.storeProducts` con `?categorySlug=` si hay categoría; si la respuesta queda vacía, refetch sin categoría (fallback). Try/catch → `[]` en error.
- Filtra `p.id !== excludeId`, toma los primeros 4.
- Si queda vacío → retorna `null` (no renderiza la sección).
- Render: `<section className="space-y-8"><h2 className="t-display text-foreground">Completa tu rutina</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">{…<ProductCard/>}</div></section>`.
- Se usa con `<Suspense>` en la page (fallback `null`) por ser async.

### C. `ProductDetailPlaceholders` (skeleton + `TODO(backend)`)
Nuevo `apps/storefront/src/components/product-detail-placeholders.tsx` — componente estático (server, sin `"use client"`) que renderiza las 4 secciones. Barras skeleton = `div` con `bg-muted rounded` y alto fijo. Cada sección con su comentario `TODO(backend)`.

- **¿Cómo usar?**: `<h2 className="t-sub-italic border-l-4 border-accent-container pl-6">¿Cómo usar?</h2>` + grid `md:grid-cols-3 gap-8`, 3 cards (`space-y-3`, sin fondo propio) cada una con 1 barra título (`h-4 w-24 bg-muted rounded`) + 3 barras línea (`h-3 w-full bg-muted rounded`).
- **Ingredientes Clave**: `<h2 className="t-section">` + grid `md:grid-cols-2 gap-8`, 2 cards con barra título + 2 barras línea.
- **Experiencias Reales**: `<h2 className="t-section italic">` + grid `md:grid-cols-2 gap-8`, 2 "reseñas" skeleton (círculo `h-10 w-10 rounded-full bg-muted` + 3 barras línea).
- **Preguntas Frecuentes**: `<h2 className="t-section">` + 4 filas (`border-b border-border py-4`), cada una una barra (`h-4 w-2/3 bg-muted rounded`).

> Nota skeleton: bloques **estáticos** (no animados); representan "contenido pendiente de backend", no un estado de carga real.

### D. Orden y layout en `page.tsx`
Dentro del `<article className="container py-10">`, después del breadcrumb:
1. Galería + Buybox (grid 2-col, `mb-20`).
2. `<ProductDetailPlaceholders />` — secciones ¿Cómo usar? · Ingredientes · Reseñas (apiladas, `space-y-20`).
3. `<Suspense fallback={null}><RelatedProducts categorySlug={firstCategory?.slug} excludeId={product.id} /></Suspense>` ("Completa tu rutina").
4. FAQ (parte de `ProductDetailPlaceholders`, al final).

Para que el orden sea ¿Cómo usar? → Ingredientes → Reseñas → **Completa tu rutina** → FAQ, `ProductDetailPlaceholders` se divide en dos exports: `ProductUsageSections` (Cómo usar + Ingredientes + Reseñas) y `ProductFaqSection` (FAQ), con `RelatedProducts` intercalado entre ambos en la page.

- Secciones full-width apiladas (`space-y-20 md:space-y-24`) — simplificación del grid 12-col de Stitch (contenido placeholder; el split exacto se afina luego).
- Sin `font-semibold` en headings.

## 4. Fuera de alcance de SP3b
- Datos reales de uso/ingredientes/reseñas/FAQ (backend).
- El split exacto 12-col de Stitch.
- Acordeón FAQ interactivo (el placeholder es estático).

## 5. Verificación
- `pnpm --filter @bymariap/storefront typecheck` + `build` en verde. (`lint` se omite por el problema de entorno conocido.)
- Visual de un detalle de producto (`/productos/<slug>`):
  - Buybox con `h1` serif **light** (no semibold), descripción ligera.
  - Secciones ¿Cómo usar?/Ingredientes/Reseñas/FAQ visibles como **bloques skeleton neutros** con sus headings.
  - "Completa tu rutina" muestra **productos reales** (cards con quick-add), o no aparece si no hay relacionados.
  - Sin regresiones; breadcrumb y add-to-cart funcionan.

## 6. Criterio de "hecho" (SP3b)
- `page.tsx` reestructurado: buybox `t-display` + secciones en orden, sin `font-semibold`.
- `related-products.tsx` (real, gate si vacío) y `product-detail-placeholders.tsx` (skeleton + `TODO(backend)`) creados.
- `typecheck`/`build` verdes y revisión visual sin regresiones.
