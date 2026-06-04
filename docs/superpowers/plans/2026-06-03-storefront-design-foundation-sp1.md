# SP1 — Fundación del design system (storefront) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establecer la fundación del design system del storefront (tokens, tipografía, íconos, componentes compartidos) para alinear con el diseño Stitch y destrabar las sub-fases de páginas.

**Architecture:** Cambios a nivel de tokens (variables CSS + Tailwind config), carga de fuentes, una capa de clases tipográficas canónicas (`t-*`), infraestructura de íconos SVG (SVGR + Material Symbols, migración incremental) y refactor visual de componentes compartidos. Sin dark mode (fuera del MVP). Sin tests automatizados nuevos: verificación por `typecheck`/`lint`/`build` + revisión visual.

**Tech Stack:** Next 15 (webpack, sin Turbopack), React 19, Tailwind 3.4, pnpm workspaces, `@svgr/webpack`, `@material-symbols/svg-300`.

**Spec:** [`docs/superpowers/specs/2026-06-03-storefront-design-system-foundation-design.md`](../specs/2026-06-03-storefront-design-system-foundation-design.md)

**Convenciones:**
- Todos los comandos se ejecutan desde la raíz del monorepo `C:\Users\Theodoro\Documents\by-mariap-online`.
- El paquete del storefront es `@bymariap/storefront`; se usa `pnpm --filter @bymariap/storefront <script>`.
- **Commits sin** el trailer `Co-Authored-By`. **No** convertir line endings a CRLF (lo maneja el usuario).

---

## Task 0: Rama de trabajo

**Files:** —

- [ ] **Step 1: Crear la rama desde main**

Run:
```bash
git checkout -b feat/storefront-design-foundation
```
Expected: `Switched to a new branch 'feat/storefront-design-foundation'`

> Nota: el árbol de trabajo tiene cambios WIP previos en `apps/admin/*` no relacionados. **No** incluirlos en ningún commit de este plan: en cada `git add` se nombran exactamente los archivos de la tarea.

---

## Task 1: Tokens de color y radio

**Files:**
- Modify: `apps/storefront/src/app/index.css:6-30`
- Modify: `apps/storefront/tailwind.config.ts:8-46`

- [ ] **Step 1: Editar las variables en `:root` de `index.css`**

En `apps/storefront/src/app/index.css`, dentro de `:root`, cambiar `--primary` y añadir las 3 variables nuevas. El bloque `:root` queda así (reemplaza el actual `--primary` y agrega las líneas marcadas):

```css
  :root {
    --background: #fbf9f5;
    --foreground: #30332e;
    --border: #b1b3ab;
    --primary: #5f5e5e;
    --primary-foreground: #faf7f6;
    --muted: #f5f4ef;
    --muted-foreground: #5d605a;
    --accent: #705b44;
    --accent-foreground: #fff7f3;
    --accent-container: #fadec0;
    --accent-container-foreground: #624e38;
    --destructive: #9e422c;
    --destructive-foreground: #fff7f6;
    --surface: #eeeee8;
    --surface-lowest: #ffffff;
    --surface-high: #e2e3db;

    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 8px;
    --radius-xl: 12px;
    --radius-full: 9999px;

    --font-heading: "Noto Serif", serif;
    --font-body: "Manrope", sans-serif;

    --container-max-width: 1280px;
  }
```

- [ ] **Step 2: Exponer los tokens en `tailwind.config.ts`**

En `apps/storefront/tailwind.config.ts`, dentro de `theme.extend.colors`, reemplazar los bloques `accent` y `surface`, y dentro de `borderRadius` añadir `xl`. Las secciones quedan así:

```ts
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          container: "var(--accent-container)",
          "container-foreground": "var(--accent-container-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          lowest: "var(--surface-lowest)",
          high: "var(--surface-high)",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },
```

- [ ] **Step 3: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores (exit 0).

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/app/index.css apps/storefront/tailwind.config.ts
git commit -m "feat(storefront): add design tokens (primary taupe, accent-container, surface-high, radius-xl)"
```

---

## Task 2: Pesos y estilos de fuente

**Files:**
- Modify: `apps/storefront/src/app/layout.tsx:7-19`

- [ ] **Step 1: Añadir Manrope 300 y Noto Serif italic**

En `apps/storefront/src/app/layout.tsx`, reemplazar las dos configuraciones de fuente por:

```tsx
const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-heading",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores (exit 0).

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/app/layout.tsx
git commit -m "feat(storefront): load Manrope 300 and Noto Serif italic"
```

---

## Task 3: Clases tipográficas canónicas `t-*`

**Files:**
- Modify: `apps/storefront/src/app/index.css` (añadir `@layer components` después del bloque `@layer base`)

- [ ] **Step 1: Añadir el bloque `@layer components`**

En `apps/storefront/src/app/index.css`, al final del archivo (después del cierre de `@layer base`), añadir:

```css
@layer components {
  .t-eyebrow {
    @apply font-body text-sm uppercase tracking-[0.2em] text-accent;
  }
  .t-hero {
    @apply font-heading text-5xl md:text-6xl font-light tracking-tight;
  }
  .t-display {
    @apply font-heading text-4xl md:text-5xl font-light tracking-tight;
  }
  .t-section {
    @apply font-heading text-2xl font-light;
  }
  .t-sub-italic {
    @apply font-heading text-xl italic;
  }
  .t-card {
    @apply font-heading text-lg;
  }
}
```

- [ ] **Step 2: Verificar que Tailwind compila las clases (build de CSS vía build de Next)**

Run: `pnpm --filter @bymariap/storefront build`
Expected: build exitoso, sin errores de `@apply` (un nombre de utilidad inexistente rompería el build).

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/app/index.css
git commit -m "feat(storefront): add canonical t-* typography component classes"
```

---

## Task 4: Infraestructura de íconos (SVGR + Material Symbols)

**Files:**
- Modify: `apps/storefront/package.json` (vía pnpm)
- Modify: `apps/storefront/next.config.mjs`
- Create: `apps/storefront/src/svgr.d.ts`

- [ ] **Step 1: Instalar dependencias**

Run:
```bash
pnpm --filter @bymariap/storefront add @material-symbols/svg-300
pnpm --filter @bymariap/storefront add -D @svgr/webpack
```
Expected: ambos paquetes quedan en `apps/storefront/package.json` (`@material-symbols/svg-300` en dependencies, `@svgr/webpack` en devDependencies).

- [ ] **Step 2: Configurar la regla SVGR en `next.config.mjs`**

Reemplazar todo el contenido de `apps/storefront/next.config.mjs` por lo siguiente. Se usa `resourceQuery: /react/` para que **solo** los imports con sufijo `?react` pasen por SVGR; los demás `.svg` siguen con el manejo por defecto de Next (`next/image`), evitando chocar con su declaración `*.svg`:

```js
/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      resourceQuery: /react/, // solo *.svg?react
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            icon: true,
            svgProps: {
              fill: "currentColor",
              "aria-hidden": "true",
              focusable: "false",
            },
            replaceAttrValues: { "#000": "currentColor", black: "currentColor" },
          },
        },
      ],
    });
    return config;
  },
};
```

- [ ] **Step 3: Declarar el tipo de los imports `*.svg?react`**

Crear `apps/storefront/src/svgr.d.ts` con (declaración propia, sin conflicto con el `*.svg` que ya declara Next):

```ts
declare module "*.svg?react" {
  import type { FC, SVGProps } from "react";
  const content: FC<SVGProps<SVGSVGElement>>;
  export default content;
}
```

- [ ] **Step 4: Verificar build (la regla SVGR solo se ejercita en build)**

Run: `pnpm --filter @bymariap/storefront build`
Expected: build exitoso. (Aún no se importa ningún `.svg`; este build valida que la config no rompe nada.)

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/next.config.mjs apps/storefront/src/svgr.d.ts apps/storefront/package.json
git add pnpm-lock.yaml
git commit -m "feat(storefront): set up SVGR + Material Symbols icon infrastructure"
```

---

## Task 5: Migrar íconos del Header y carrito a Material Symbols

**Files:**
- Modify: `apps/storefront/src/components/header.tsx:2,52`
- Modify: `apps/storefront/src/components/cart-icon-button.tsx:4,16`

- [ ] **Step 1: Migrar el ícono de usuario en `header.tsx`**

En `apps/storefront/src/components/header.tsx`:

Reemplazar la línea de import de lucide:
```tsx
import { User } from "lucide-react";
```
por:
```tsx
import Person from "@material-symbols/svg-300/outlined/person.svg?react";
```

Reemplazar el uso del ícono:
```tsx
            <User className="h-5 w-5" strokeWidth={1.5} />
```
por:
```tsx
            <Person className="h-5 w-5" />
```

- [ ] **Step 2: Migrar el ícono del carrito en `cart-icon-button.tsx`**

En `apps/storefront/src/components/cart-icon-button.tsx`:

Reemplazar el import:
```tsx
import { ShoppingBag } from "lucide-react";
```
por:
```tsx
import ShoppingBag from "@material-symbols/svg-300/outlined/shopping_bag.svg?react";
```

Reemplazar el uso:
```tsx
      <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
```
por:
```tsx
      <ShoppingBag className="h-5 w-5" />
```

> Nota: el `strokeWidth` desaparece (los glyphs de Material Symbols son rellenos, no trazados; el grosor lo da el set `svg-300`).

- [ ] **Step 3: Verificar typecheck y build**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

Run: `pnpm --filter @bymariap/storefront build`
Expected: build exitoso (valida que los imports `.svg` resuelven).

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/components/header.tsx apps/storefront/src/components/cart-icon-button.tsx
git commit -m "feat(storefront): migrate header and cart icons to Material Symbols SVG"
```

---

## Task 6: Variante `secondary` en Button

**Files:**
- Modify: `apps/storefront/src/components/ui/button.tsx:4-13`

- [ ] **Step 1: Añadir la variante**

En `apps/storefront/src/components/ui/button.tsx`, reemplazar el type `Variant` y el objeto `variantClasses`:

```tsx
type Variant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-accent text-accent-foreground hover:opacity-90",
  outline: "border border-border bg-background hover:bg-muted text-foreground",
  ghost: "hover:bg-muted text-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
  link: "underline-offset-4 hover:underline text-foreground p-0 h-auto",
};
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/ui/button.tsx
git commit -m "feat(storefront): add secondary (accent) Button variant"
```

---

## Task 7: Variante `accent` en Badge

**Files:**
- Modify: `apps/storefront/src/components/ui/badge.tsx`

- [ ] **Step 1: Añadir prop `variant`**

Reemplazar todo el contenido de `apps/storefront/src/components/ui/badge.tsx` por:

```tsx
import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "accent";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  accent: "bg-accent-container text-accent-container-foreground",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...p }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-3 py-1 text-xs font-body font-medium",
        variantClasses[variant],
        className,
      )}
      {...p}
    />
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores (la firma sigue aceptando los usos actuales `<Badge>{c.name}</Badge>` porque `variant` es opcional).

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/ui/badge.tsx
git commit -m "feat(storefront): add accent (peach) Badge variant"
```

---

## Task 8: Rediseño tonal de OrderStatusPill

**Files:**
- Modify: `apps/storefront/src/components/order-status-pill.tsx:4-11`

- [ ] **Step 1: Reemplazar el mapa de estilos por tonos suaves**

En `apps/storefront/src/components/order-status-pill.tsx`, reemplazar el objeto `styles`:

```tsx
const styles: Record<OrderStatus, { label: string; className: string }> = {
  pending:   { label: 'Pago pendiente', className: 'bg-muted text-muted-foreground' },
  paid:      { label: 'Pagado',         className: 'bg-surface-high text-foreground' },
  preparing: { label: 'En preparación', className: 'bg-surface-high text-foreground' },
  shipped:   { label: 'Enviado',        className: 'bg-accent-container text-accent-container-foreground' },
  delivered: { label: 'Entregado',      className: 'bg-accent-container text-accent-container-foreground' },
  cancelled: { label: 'Cancelado',      className: 'bg-destructive/10 text-destructive' },
};
```

> El `<span>` y sus clases de forma (`rounded-full px-4 py-1 text-xs ... uppercase tracking-wide`) no cambian.

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/order-status-pill.tsx
git commit -m "feat(storefront): redesign OrderStatusPill as soft tonal pills"
```

---

## Task 9: Alinear AppointmentStatusPill a la misma forma

**Files:**
- Modify: `apps/storefront/src/components/appointment-status-pill.tsx:4-17`

- [ ] **Step 1: Unificar tonos y forma con OrderStatusPill**

Reemplazar el objeto `config` y la clase del `<span>` en `apps/storefront/src/components/appointment-status-pill.tsx`:

```tsx
const config: Record<AppointmentStatus, { label: string; className: string }> = {
  scheduled: { label: 'Agendada',   className: 'bg-surface-high text-foreground' },
  completed: { label: 'Completada', className: 'bg-muted text-muted-foreground' },
  cancelled: { label: 'Cancelada',  className: 'bg-destructive/10 text-destructive' },
  no_show:   { label: 'No asistió', className: 'bg-destructive/10 text-destructive' },
};

export function AppointmentStatusPill({ status }: { status: AppointmentStatus }) {
  const { label, className } = config[status] ?? config.scheduled;
  return (
    <span className={cn('inline-block rounded-full px-4 py-1 text-xs font-body font-medium uppercase tracking-wide', className)}>
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/appointment-status-pill.tsx
git commit -m "feat(storefront): align AppointmentStatusPill shape and tones with OrderStatusPill"
```

---

## Task 10: Título serif en ProductCard

**Files:**
- Modify: `apps/storefront/src/components/product-card.tsx:27-30`

- [ ] **Step 1: Cambiar el título a `t-card`**

En `apps/storefront/src/components/product-card.tsx`, reemplazar el `<h3>` del título:

```tsx
        <h3 className="text-sm font-body font-medium text-foreground">
          {product.name}
        </h3>
```
por:
```tsx
        <h3 className="t-card text-foreground">
          {product.name}
        </h3>
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/product-card.tsx
git commit -m "feat(storefront): use serif t-card title in ProductCard"
```

---

## Task 11: Verificación final (typecheck + lint + build + visual)

**Files:** —

- [ ] **Step 1: Typecheck, lint y build completos**

Run:
```bash
pnpm --filter @bymariap/storefront typecheck
pnpm --filter @bymariap/storefront lint
pnpm --filter @bymariap/storefront build
```
Expected: los tres en verde (exit 0).

- [ ] **Step 2: Revisión visual manual**

Run: `pnpm --filter @bymariap/storefront dev`

Abrir `http://localhost:3000` y verificar:
- CTAs primarios en **taupe `#5f5e5e`** (más claros que el negro anterior).
- Íconos del **Header (persona)** y del **carrito (bolsa)** se renderizan (Material Symbols, heredan el color del texto).
- En `/mi-cuenta/pedidos` (con un pedido), la `OrderStatusPill` se ve **tonal suave** (no relleno oscuro). *(Si no hay datos/login, basta confirmar que compila y que el componente no rompe.)*
- En `/productos`, los **títulos de las cards en serif** (`t-card`).
- Sin regresiones de layout evidentes en home, tienda y carrito.

- [ ] **Step 3: Confirmar estado de git**

Run: `git log --oneline feat/storefront-design-foundation -11`
Expected: ver los ~10 commits de las tareas 1–10, sin tocar archivos de `apps/admin`.

> No hay commit en esta tarea: es solo verificación. La integración de la rama (merge/PR) se decide al cerrar SP1 con el usuario.

---

## Notas de cierre

- Al terminar SP1, la mayoría de discrepancias sistémicas (G1 parcial, G2, G3, G5, G6, íconos) quedan resueltas a nivel de fundación. Las **aplicaciones por página** (`t-*` en cada `h1/h2`, `rounded-xl` en cards, heroes con placeholder, secciones de detalle) son SP2–SP5.
- Supuesto a validar con el usuario: tonos de `preparing`/`delivered` en OrderStatusPill (extrapolación; Stitch solo mostró "Pagado" y "Enviado").
