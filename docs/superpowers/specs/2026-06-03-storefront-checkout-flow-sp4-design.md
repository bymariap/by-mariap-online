# Spec — SP4: Flujo de compra (carrito, checkout, confirmación)

- **Fecha:** 2026-06-03
- **Tipo:** Diseño/spec (brainstorming). Implementación posterior vía plan.
- **Relacionado:** [Auditoría](../audits/2026-06-01-storefront-design-audit.md) (3.4–3.6) · [Decisiones](../audits/2026-06-01-storefront-design-decisions.md) · [SP1 spec](./2026-06-03-storefront-design-system-foundation-design.md)
- **Depende de:** SP1, SP1.1, SP2, SP3 (en `main`).

## 1. Contexto y objetivo

Alinear el flujo de compra con Stitch: `/carrito` (activo y vacío), `/checkout` y `/checkout/confirmacion`. Son páginas funcionales (cart, Wompi, react-query ya hechos); SP4 es **fidelidad visual** + dos enriquecimientos decididos. **Toda la lógica se mantiene** (mutaciones de carrito, redirect Wompi, polling de estado, estados de carga/error/vacío).

## 2. Decisiones aplicadas

- **Carrito vacío enriquecido:** se añade un bloque con **3 categorías reales** (fetch) como sugerencias, con imágenes placeholder (D4) y títulos itálicos, enlazando a `/productos?categoria=`.
- **Checkout sin círculos numerados:** se eliminan los `<span>` numerados (1/2); headings serif planos (fiel a Stitch).
- **Patrón transversal:** headings a clases `t-*` (cero `font-semibold`); cards de sombra a `rounded-xl` (G5); token `accent-container` en vez del `#fadec0` hardcodeado (G2); íconos de los archivos tocados migrados a Material Symbols SVGR `?react` (D2, incremental).
- Se mantiene la divergencia **V1** (checkout sin sección de tarjeta; pago por redirect Wompi).

## 3. Diseño

### A. Carrito — `apps/storefront/src/app/carrito/page.tsx`
- **Activo:**
  - `h1` "Tu carrito": `font-heading text-3xl font-semibold` → **`t-display`**.
  - Card de resumen (`aside > div`): `rounded-md` → **`rounded-xl`**.
  - "Resumen" (`h2`): `text-lg font-semibold` → **`t-section`**.
  - Caja "Envío Seguro & Premium": `style={{ background: "#fadec0" }}` → `className="… bg-accent-container"` (quitar el `style`).
  - Íconos: `Trash2` → `@material-symbols/svg-300/outlined/delete.svg?react`; `ShieldCheck` → `verified_user.svg?react`. (Quitar import de `lucide-react`.)
- **Vacío:** además del bloque actual (título → `t-display`, párrafo, CTA "Ver productos"), renderizar `<EmptyCartSuggestions />` debajo.

### B. EmptyCartSuggestions — `apps/storefront/src/components/empty-cart-suggestions.tsx` (nuevo, client)
- `"use client"`. Usa `useQuery(["categories"], () => api.get<CategoryDTO[]>(endpoints.storeCategories))`.
- Si no hay datos / vacío → retorna `null`.
- Render: `<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">` con las **primeras 3** categorías; cada una un `<Link href={`/productos?categoria=${c.slug}`}>` que contiene: caja imagen placeholder `aspect-[4/5] bg-muted rounded-xl` (`{/* TODO(asset): imagen de categoría */}`) + `<p className="font-heading italic text-lg text-foreground mt-3">{c.name}</p>`.

### C. Checkout — `apps/storefront/src/app/checkout/page.tsx`
- `h1` "Finalizar Compra": → **`t-display`**.
- Las dos secciones (`h2` "Identificación y Entrega", "Método de Envío"): quitar el `<span … rounded-full bg-primary …>1/2</span>` y pasar el `h2` a **`t-section`** (sin el `flex items-center gap-2`).
- "Resumen de Orden" (`h2` del aside): → **`t-section`**. Card del aside: `rounded-md` → **`rounded-xl`**.
- CTA "Pagar con Wompi": añadir `uppercase tracking-widest` a su `className` (lógica intacta).
- Inputs, labels, validación, lógica de envío y submit: **sin cambios**.

### D. Confirmación — `apps/storefront/src/app/checkout/confirmacion/page.tsx`
- `h1` (¡Gracias…/Procesando…/Pago no completado): `text-3xl font-semibold` → **`t-display`**.
- Cards (Resumen de tu pedido, Dirección de Entrega): `rounded-md` → **`rounded-xl`**; sus `h2` `text-base font-semibold` → **`font-heading text-lg`**.
- Íconos: `CheckCircle` → `check_circle.svg?react`; `Clock` → `schedule.svg?react`. (Quitar import de `lucide-react`.)
- `OrderStatusPill` (ya tonal, SP1), referencia, fecha, CTAs y polling: **sin cambios**.

## 4. Fuera de alcance de SP4
- Imágenes reales de las category cards del carrito vacío (placeholder D4).
- Flujo de pago propio / sección de tarjeta (Wompi redirect, V1).
- SP5 (cuenta + booking).

## 5. Verificación
- `pnpm --filter @bymariap/storefront typecheck` + `build` en verde. (`lint` se omite por el problema de entorno conocido.)
- Visual:
  - **Carrito activo:** `h1`/"Resumen" en serif light; card `rounded-xl`; caja envío en peach (token); íconos Material Symbols; qty/eliminar/ir a pagar funcionan.
  - **Carrito vacío:** título serif + 3 cards de categoría (placeholder + nombre itálico) que navegan al catálogo filtrado.
  - **Checkout:** sin círculos numerados; headings serif; CTA en mayúsculas; el flujo a Wompi funciona.
  - **Confirmación:** `h1` serif light; cards `rounded-xl`; íconos Material Symbols; pill de estado tonal; polling de pending sin regresión.

## 6. Criterio de "hecho" (SP4)
- Las 3 páginas con tipografía `t-*`, cards `rounded-xl`, token `accent-container`, e íconos migrados; checkout sin círculos numerados.
- `EmptyCartSuggestions` creado y montado en el carrito vacío.
- `typecheck`/`build` verdes y revisión visual sin regresiones funcionales.
