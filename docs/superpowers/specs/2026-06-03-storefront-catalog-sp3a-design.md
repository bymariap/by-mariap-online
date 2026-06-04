# Spec — SP3a: Catálogo (`/productos`)

- **Fecha:** 2026-06-03
- **Tipo:** Diseño/spec (brainstorming). Implementación posterior vía plan.
- **Relacionado:** [Auditoría](../audits/2026-06-01-storefront-design-audit.md) (3.2) · [Decisiones](../audits/2026-06-01-storefront-design-decisions.md) · [SP1 spec](./2026-06-03-storefront-design-system-foundation-design.md)
- **Depende de:** SP1 (fundación) y SP2 (home), ambos en `main`.

## 1. Contexto y objetivo

Alinear la página de catálogo (`apps/storefront/src/app/productos/page.tsx`) con el diseño Stitch "Tienda - Consistencia Total Luminous": sidebar con 3 grupos de filtros, grid de 4 columnas, encabezado dinámico, y `ProductCard` con botón de agregar al carrito en hover.

SP3 se dividió en **SP3a (Catálogo, este spec)** y **SP3b (Detalle)**. SP3a finaliza el `ProductCard` (con quick-add), que SP3b reutilizará.

## 2. Decisiones aplicadas

- **Filtros "Objetivo" y "Precio": placeholder.** Se maquetan visibles pero **no funcionales** (`TODO(backend)`); el filtrado real debe hacerse en backend (la API `store/products` hoy solo soporta `categorySlug`/`search`). "Categorías" se mantiene funcional (ya usa el backend).
- **Quick-add funcional:** botón en hover sobre la card que agrega al carrito (usa `useAddToCart` existente).
- **Encabezado dinámico:** el `h1` refleja el nombre de la categoría activa; fallback "Colección de Cuidado" sin categoría. Sin cambios de backend (usa datos que la page ya tiene).
- **Naming Opción A; íconos:** sin migración nueva en esta página (quick-add es texto).

## 3. Diseño

### A. Sidebar de filtros (3 grupos)
Archivo del grupo de categorías: `apps/storefront/src/components/category-filter.tsx`. Nuevos placeholders: `apps/storefront/src/components/catalog-filters-placeholder.tsx`.

- **Categorías** (funcional, existente): cambiar el heading del grupo de `text-xs uppercase` a serif `font-heading text-lg text-foreground`. Los links (Todos + categorías) se mantienen; el activo usa `bg-primary text-primary-foreground` (ahora taupe). Lógica de `searchParams` sin cambios.
- **Objetivo** (placeholder): grupo nuevo con heading serif `text-lg` + 3 opciones **inertes** (checkbox `disabled` + label): "Crecimiento", "Definición", "Hidratación". Comentario `{/* TODO(backend): filtro por objetivo */}`.
- **Precio** (placeholder): heading serif `text-lg` + control visual **inerte** (`<input type="range" disabled>` o dos `<input>` min/max `disabled`) con etiquetas. Comentario `{/* TODO(backend): filtro por precio */}`.
- Los placeholders son **estáticos** (sin `"use client"`), visualmente claros como inertes (opacidad reducida / cursor-not-allowed).
- En el `<aside>` de `page.tsx`: `CategoryFilter` seguido de `CatalogFiltersPlaceholder`.

### B. Encabezado dinámico + grid
En `apps/storefront/src/app/productos/page.tsx`:
- Título dinámico:
  ```tsx
  const active = categories.find((c) => c.slug === categoria);
  const title = active?.name ?? "Colección de Cuidado";
  ```
  Render: `<h1 className="t-section text-foreground">{title}</h1>`.
- Subtítulo (conteo) se mantiene; texto a `font-light`.
- Grid de productos **4-up**: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12` (hoy `grid grid-cols-2 lg:grid-cols-3 gap-6`).
- Estado vacío ("No hay productos en esta categoría.") se mantiene.

### C. ProductCard + Quick-add
Archivo: `apps/storefront/src/components/product-card.tsx` (reestructura) + nuevo `apps/storefront/src/components/quick-add-button.tsx`.

- **Reestructura de `ProductCard`** (sigue server component), para no anidar `<button>` dentro de `<a>`:
  ```
  <div className="group">
    <div className="relative aspect-square rounded-sm overflow-hidden bg-muted">
      <Link href={detalle}> <Image …/> </Link>
      {stockQuantity > 0 && (
        <QuickAddButton
          productId={product.id}
          className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
    </div>
    <Link href={detalle} className="mt-3 block space-y-0.5">
      <h3 className="t-card text-foreground">{name}</h3>
      <p className="text-sm font-body text-muted-foreground">{precio}</p>
    </Link>
  </div>
  ```
  - El placeholder "Sin imagen" (cuando no hay `imageUrls[0]`) se mantiene dentro del `<Link>` de la imagen.
  - `QuickAddButton` es **hermano** del `Link` de la imagen (no anidado).
- **`QuickAddButton`** (nuevo, `"use client"`):
  - Props: `productId: string`, `className?: string`.
  - Usa `useAddToCart()`; al click: `e.preventDefault()` + `e.stopPropagation()`, `mutate({ productId, quantity: 1 })` con `toast.success("Agregado al carrito")` / `toast.error(...)`. `disabled` mientras `isPending`.
  - Estilo: `bg-surface-lowest shadow-md py-2.5 rounded-full text-xs font-body font-medium uppercase tracking-widest text-foreground hover:bg-muted transition-colors` + el `className` recibido. (Fondo sólido a propósito: ver nota de tokens §6.)
  - Texto: "Añadir" (o "Agregando…" mientras `isPending`).

### D. Transversal
- Promo banner superior ("Envío gratis en Medellín…") se mantiene.
- Sin `font-semibold` en headings.

## 4. Fuera de alcance de SP3a
- Filtrado real por Objetivo/Precio (backend).
- Paginación.
- Detalle de producto (SP3b).

## 5. Verificación
- `pnpm --filter @bymariap/storefront typecheck` + `lint` + `build` en verde.
- Visual de `/productos`:
  - Sidebar con 3 grupos; "Categorías" funcional (cambia el listado), "Objetivo"/"Precio" visibles e **inertes**.
  - Encabezado cambia al nombre de la categoría al filtrar; vuelve a "Colección de Cuidado" sin filtro.
  - Grid 4-up en desktop.
  - Hover sobre una card muestra "Añadir"; al click agrega al carrito (badge del header sube, toast de éxito). Cards sin stock no muestran el botón.
- Sin tests automatizados nuevos (cambios visuales/UX simples sobre hooks existentes).

## 6. Nota de tokens (modificador de opacidad)

Los colores en `tailwind.config.ts` se definen como `var(--x)` con valores **hex**. En Tailwind 3 el modificador de opacidad (`bg-x/90`, `bg-x/10`) **no aplica alpha** con ese formato (requiere canales `R G B` + `rgb(var(--x) / <alpha-value>)`). Por eso en código nuevo se usan **fondos sólidos** (aquí `bg-surface-lowest`).

> **Riesgo heredado a verificar (fuera de SP3a):** SP1 dejó `bg-destructive/10` en `OrderStatusPill`/`AppointmentStatusPill` (estados "Cancelado"/"No asistió"). Si la opacidad no aplica, esos pills quedarían en rojo sólido con texto rojo (ilegible). Conviene verificar y, si aplica, corregir como tarea aparte (p.ej. añadir tokens de tinte sólidos o migrar el formato de tokens a canales con `<alpha-value>`).

## 7. Criterio de "hecho" (SP3a)
- Sidebar con Categorías (serif) + Objetivo + Precio (placeholders inertes con `TODO(backend)`).
- `h1` dinámico por categoría; grid 4-up.
- `ProductCard` reestructurado con `QuickAddButton` funcional (solo si hay stock).
- `typecheck`/`lint`/`build` verdes y revisión visual sin regresiones.
