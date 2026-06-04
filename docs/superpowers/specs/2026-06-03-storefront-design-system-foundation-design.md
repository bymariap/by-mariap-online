# Spec — SP1: Fundación del design system (storefront)

- **Fecha:** 2026-06-03
- **Tipo:** Diseño/spec (resultado del brainstorming). Implementación posterior vía plan.
- **Relacionado:** [Auditoría de diseño](../audits/2026-06-01-storefront-design-audit.md) · [Decisiones de triage](../audits/2026-06-01-storefront-design-decisions.md)
- **Alcance del codebase:** `apps/storefront` (Next 15, React 19, Tailwind 3.4).

## 1. Contexto y objetivo

La auditoría encontró que el storefront diverge del diseño aprobado en Stitch, y que la mayoría de las ~30 discrepancias salen de **5–6 causas raíz** (set de tokens colapsado, peso de headings, primario muy oscuro, radios colapsados, acento `secondary` sin usar, íconos distintos).

Este spec cubre **SP1**, el primero de una descomposición en sub-proyectos. SP1 es la **fundación**: arregla las causas raíz a nivel de tokens, tipografía, íconos y componentes compartidos, para que las sub-fases siguientes (páginas) sean en su mayoría traducción mecánica de Stitch.

### Mapa de sub-proyectos (contexto, no alcance de este spec)

| | Sub-proyecto | Estado |
|---|---|---|
| **SP1** | **Fundación del design system** | **este spec** |
| SP2 | Home (hero, trust 3.1.1, services banner 3.1.2, transformaciones placeholder, fix CTA V4) | pendiente |
| SP3 | Catálogo + Detalle (filtros, grid 4-up, cards, secciones placeholder) | pendiente |
| SP4 | Carrito + Checkout + Confirmación | pendiente |
| SP5 | Cuenta + Booking (login, perfil, pedidos, citas, servicios) | pendiente |

## 2. Decisiones aplicadas (del triage)

- **D1** Primario `#5f5e5e` (taupe de Stitch).
- **D2** Íconos Material Symbols vía SVG, migración **incremental** (infra en SP1, resto por página).
- **D5/V2** Dark mode **fuera del MVP**. La arquitectura de tokens (variables CSS) queda lista para añadir dark después sin reescribir.
- **Token naming: Opción A** — mantener nombres semánticos existentes y solo añadir lo que falta con nombres semánticos. La traducción de los nombres M3 de Stitch → semánticos se hace al maquetar cada página.

## 3. Tokens (`src/app/index.css` + `tailwind.config.ts`)

### 3.1 Cambio
- `--primary`: `#1a1a1a` → **`#5f5e5e`** (D1). `--primary-foreground` se mantiene `#faf7f6`.

### 3.2 Variables nuevas en `:root`
| Variable | Valor | Equivale en Stitch | Uso |
|---|---|---|---|
| `--accent-container` | `#fadec0` | `secondary-container` | Acento peach (G2): círculo trust, badges, pill "Enviado/Entregado", banner detalle |
| `--accent-container-foreground` | `#624e38` | `on-secondary-container` | Texto/ícono sobre peach |
| `--surface-high` | `#e2e3db` | `surface-container-highest` | Chip neutro: círculo trust 3, pill "Pagado/En preparación", card services banner |
| `--radius-xl` | `12px` | `borderRadius.xl` | Cards editoriales (G5) |

### 3.3 Reutilización (no se crean tokens de más)
- Stitch `tertiary-container #f4f4ef` ≈ `--muted #f5f4ef` → se reutiliza `muted`.
- `--accent #705b44` ya existe (= "secondary" de Stitch) → solo se le añade el `-container`.

### 3.4 Exposición en `tailwind.config.ts`
Añadir, todo vía `var(--token)` (el canon es la variable CSS, nunca un hex en la config):
- `accent.container` → `var(--accent-container)`
- `accent['container-foreground']` → `var(--accent-container-foreground)`
- `surface.high` → `var(--surface-high)`
- `borderRadius.xl` → `var(--radius-xl)`

Disponible tras esto: `bg-accent-container`, `text-accent-container-foreground`, `bg-surface-high`, `rounded-xl`.

### 3.5 Fuentes (`src/app/layout.tsx`, G7)
- Manrope: añadir peso **300** a la lista de weights.
- Noto Serif: añadir estilo **italic** (`style: ["normal", "italic"]`).

## 4. Íconos (Material Symbols SVG, sin wrapper)

### 4.1 Paquete
- `@material-symbols/svg-300` (outlined). Peso **300 outlined** = exactamente lo que define Stitch (`'FILL' 0, 'wght' 300`). Si una pantalla puntual necesita más grosor, se importa desde `svg-400`.

### 4.2 Render: SVG inline vía SVGR (import directo, sin componente wrapper)
- Configurar **SVGR** una vez en `next.config` (regla **webpack** para `.svg` → componente React). Aplica a los scripts actuales `next dev`/`next build` (sin Turbopack); si en el futuro se adopta `--turbo`, la regla SVGR debe portarse a la config de Turbopack.
- Opciones de SVGR para que los defaults queden garantizados en build:
  - `icon: true` (escala a 1em, sin width/height fijos de 24px).
  - `svgProps: { "aria-hidden": "true", focusable: "false" }`.
  - `replaceAttrValues: { "#000": "currentColor", black: "currentColor" }` (hereda el color del texto).
- Uso en call-site (1:1 con lucide actual):
  ```tsx
  import LocalShipping from "@material-symbols/svg-300/outlined/local_shipping.svg";
  <LocalShipping className="h-6 w-6" />
  ```
- **Sin wrapper `<Icon>`**: los defaults los cubre la config de SVGR; un wrapper solo se justificaría con íconos por nombre dinámico, que no es el caso (YAGNI).

### 4.3 Alcance de migración en SP1
- SP1 entrega la **infra** (paquete + SVGR config) y migra **solo** los íconos de `Header` y `cart-icon-button` como implementación de referencia.
- lucide y Material Symbols **conviven**; el resto de íconos migran en su página (SP2–SP5).

## 5. Escala tipográfica (G1) — clases `t-*` en `@layer components`

Causa raíz de G1: drift de headings a `font-semibold` por escribirse inline sin fuente única. Se fija una **fuente canónica** de 6 clases en `src/app/index.css`:

```css
@layer components {
  .t-eyebrow    { @apply font-body text-sm uppercase tracking-[0.2em] text-accent; }
  .t-hero       { @apply font-heading text-5xl md:text-6xl font-light tracking-tight; }
  .t-display    { @apply font-heading text-4xl md:text-5xl font-light tracking-tight; }
  .t-section    { @apply font-heading text-2xl font-light; }
  .t-sub-italic { @apply font-heading text-xl italic; }
  .t-card       { @apply font-heading text-lg; }
}
```

| Clase | Rol | Ejemplos |
|---|---|---|
| `t-eyebrow` | Overline | "Digital Atelier", "Cuidado en Estudio" |
| `t-hero` | Hero H1 | Home hero, citas |
| `t-display` | H1 de página | Carrito, confirmación, perfil, pedidos, login, checkout |
| `t-section` | H2 funcional | Checkout, "Resumen", secciones de cuenta |
| `t-sub-italic` | Sub-sección itálica | Perfil "Información Personal", detalle "Ingredientes" |
| `t-card` | Título de card | ProductCard, ServiceCard |

Reglas:
- **Nada de `font-semibold` en headings**; énfasis por tamaño + serif.
- Son clases (no componentes React); se pueden sobreescribir con utilities inline (`<h1 className="t-display text-on-surface">`).
- Las **H2 marketing** del home (`text-4xl md:text-5xl font-light`) usan `t-display` (mismo tamaño). Si un caso puntual no encaja, se usan utilities inline.

**Entrega de SP1:** define las clases `t-*` y las aplica en los componentes compartidos que ya toca (ProductCard, Sección 6). La aplicación de `t-*` en los `h1/h2` de cada página es de SP2–SP5.

## 6. Componentes compartidos

| Componente | Cambio en SP1 |
|---|---|
| `ui/button.tsx` | `default` hereda `#5f5e5e` (token). **Añadir variante `secondary`**: `bg-accent text-accent-foreground`. Tamaños sin cambio. |
| `ui/badge.tsx` | **Añadir variante `accent`**: `bg-accent-container text-accent-container-foreground`. `default` (muted) se mantiene. |
| `order-status-pill.tsx` | **Rediseño tonal (G6):** `pending` `bg-muted text-muted-foreground` · `paid`/`preparing` `bg-surface-high text-foreground` · `shipped`/`delivered` `bg-accent-container text-accent-container-foreground` · `cancelled` `bg-destructive/10 text-destructive`. Mantiene `uppercase tracking`. |
| `appointment-status-pill.tsx` | Alinear a la **misma forma/escala** que OrderStatusPill (ya es tonal). |
| `product-card.tsx` | Título → `t-card` (serif). **Sin** botón add-en-hover (SP3). |
| `Header` + `cart-icon-button` | Migrar íconos a Material Symbols SVG (referencia de la infra, §4.3). |

## 7. Fuera de alcance de SP1

- `ServiceCard` (solo en `/servicios`) → SP5.
- Unificar inputs del `BookingForm` + `focus:ring` → SP5.
- Botón add-en-hover de `ProductCard` → SP3.
- Aplicar `t-*` y `rounded-xl` en layouts/cards de página, secciones placeholder, heroes con imagen → SP2–SP5.
- Dark mode → fuera del MVP (D5).

## 8. Supuestos

- **Tonos de pedido extrapolados:** Stitch solo mostró "Pagado" (surface-high) y "Enviado" (peach). Los tonos de `preparing`/`delivered` son extrapolación consistente nuestra (sin referencia 1:1). A validar.
- `tertiary-container #f4f4ef` se considera equivalente a `--muted #f5f4ef` (diferencia despreciable).

## 9. Verificación

- `pnpm typecheck` + `lint` + `build` en verde.
- Run manual del storefront sin regresiones; verificar visualmente: primario taupe en CTAs, `OrderStatusPill` tonal, título de `ProductCard` en serif, íconos del Header migrados.
- Sin tests automatizados nuevos: los cambios son de tokens/visuales; la verificación es typecheck/build + revisión visual.

## 10. Criterio de "hecho" (SP1)

- Tokens nuevos definidos y expuestos; `--primary = #5f5e5e`; fuentes con Manrope 300 + Noto Serif italic.
- SVGR configurado; íconos de Header/cart en Material Symbols; lucide aún presente para el resto.
- Clases `t-*` definidas y aplicadas en ProductCard.
- Button (`secondary`), Badge (`accent`), OrderStatusPill (tonal), AppointmentStatusPill (alineada) actualizados.
- `typecheck`/`lint`/`build` verdes y revisión visual sin regresiones.
