# Spec — SP2: Home (storefront)

- **Fecha:** 2026-06-03
- **Tipo:** Diseño/spec (brainstorming). Implementación posterior vía plan.
- **Relacionado:** [Auditoría](../audits/2026-06-01-storefront-design-audit.md) (3.1, 3.1.1, 3.1.2) · [Decisiones](../audits/2026-06-01-storefront-design-decisions.md) · [SP1 spec](./2026-06-03-storefront-design-system-foundation-design.md)
- **Depende de:** SP1 (fundación) ya integrado en `main`.

## 1. Contexto y objetivo

Reconstruir el home (`apps/storefront/src/app/page.tsx`) para que coincida con el diseño Stitch "Home Page - Recuperación de Cejas", usando la fundación de SP1 (tokens, clases `t-*`, `Button variant="secondary"`, íconos Material Symbols vía SVGR `?react`). Incluye un ajuste mínimo al `Header` (nav "Galería").

## 2. Decisiones aplicadas

- **D3 / "placeholders neutros":** las secciones que dependen de backend inexistente se maquetan y son visibles, con cajas placeholder (sin contenido falso) y marca `TODO(backend)` en código (para QA, invisible al cliente).
- **D4:** las imágenes se maquetan como cajas dimensionadas con `bg-muted` (sin imagen real), estructuradas para soltar la imagen después.
- **V4:** el CTA "Agendar Cita" se activa (marrón + ícono) y enlaza a `/servicios`; se elimina "(Próximamente)".
- **Naming Opción A:** clases Tailwind semánticas del storefront (los nombres M3 de Stitch se traducen al maquetar).
- **Íconos:** migración incremental; en este page se migran los 4 íconos del home a Material Symbols.

## 3. Diseño por secciones

Orden de secciones (Stitch): **Hero → Trust → Transformaciones → Featured → Services banner**.

### A. Header (nav "Galería")
- `apps/storefront/src/components/header.tsx`: añadir `{ label: "Galería", href: "/#galeria" }` al array `navLinks` (entre "Servicios" y "Nosotros").

### B. Hero (3.1) — fondo full-bleed con placeholder, texto a la izquierda
- Sección: `relative min-h-[80vh] flex items-center overflow-hidden`.
- **Fondo full-bleed (placeholder D4):** `div` con `absolute inset-0 bg-muted`. Comentario `{/* TODO(asset): imagen de fondo del hero */}`. Estructurado para reemplazar por un `<Image fill>` después.
- **Contenido (encima, izquierda):** `container relative z-10 max-w-xl px-8 md:px-16 space-y-6`:
  - `<p className="t-eyebrow">Digital Atelier • Medellín</p>`
  - `<h1 className="t-hero text-foreground">Recupera la belleza natural de tus cejas</h1>`
  - `<p className="font-body text-base md:text-lg font-light text-muted-foreground max-w-md leading-relaxed">…</p>` (copy actual)
  - CTA primario: `<Link>` con estilo de `Button` default (taupe), texto "Ver Productos →".
- **Nota:** sobre `bg-muted` (claro), `text-foreground` se lee bien. Cuando entre la imagen real, añadir un scrim (degradado) para contraste — fuera de SP2.

### C. Trust indicators (3.1.1)
- Sección `bg-surface py-20`.
- Grid `container grid grid-cols-1 md:grid-cols-3 gap-16`.
- Cada ítem: `flex flex-col items-center text-center gap-4` (centrado).
  - Círculo: `w-16 h-16 rounded-full flex items-center justify-center`, con fondo/texto tonal por ítem:
    - Envíos → `bg-accent-container text-accent-container-foreground`, ícono `local_shipping`.
    - Ubicación → `bg-muted text-foreground`, ícono `location_on`.
    - Certificados → `bg-surface-high text-foreground`, ícono `verified_user`.
  - Íconos: Material Symbols SVGR, `import X from "@material-symbols/svg-300/outlined/<name>.svg?react"`, render `<X className="h-7 w-7" />` (texto del círculo da el color).
  - Título: `<h3 className="font-heading text-xl text-foreground">`.
  - Body: `<p className="font-body text-sm font-light text-muted-foreground leading-relaxed">`.
- Textos: los actuales (Envíos en Medellín y Colombia / Ubicación en El Poblado / Productos Certificados).

### D. Transformaciones (nueva — placeholder D3)
- Sección `id="galeria"` con `bg-muted py-24`.
- Encabezado: fila con `t-eyebrow` "Transformaciones" + `h2.t-display` "Nuestras transformaciones" a la izquierda y link "Ver Galería Completa →" (`font-body text-sm text-muted-foreground hover:text-foreground`) a la derecha (`flex items-end justify-between`).
- Grid `grid grid-cols-1 md:grid-cols-3 gap-6` de **3 cajas placeholder**: `aspect-[4/5] bg-surface-high rounded-xl`.
- Comentario en el código: `{/* TODO(backend): galería real de transformaciones (antes/después) */}`.
- Sin contenido falso dentro de las cajas.

### E. Featured products "Esenciales" (ajuste tipográfico)
- Heading → `<h2 className="t-display text-foreground">Esenciales para tus cejas</h2>`.
- Subtítulo → `font-body text-sm md:text-base font-light text-muted-foreground`.
- Grid 4-up se mantiene (`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6`). `ProductCard` ya es serif (SP1).
- Estado vacío y link "Ver todos los productos →" se mantienen (texto igual).

### F. Services banner (3.1.2 + V4)
- Sección `py-24 px-8`.
- Card: `container rounded-xl overflow-hidden relative min-h-[500px] flex items-center p-12 md:p-24 bg-surface-high`.
  - Fondo placeholder (D4): `div` `absolute inset-0 bg-muted opacity-60` + comentario `{/* TODO(asset): imagen del estudio */}`.
- Contenido: `relative z-10 max-w-xl` (izquierda):
  - `<span className="t-eyebrow">Cuidado en Estudio</span>`
  - `<h2 className="t-display text-foreground">Diseño y recuperación experta</h2>`
  - `<p className="font-body text-lg font-light text-muted-foreground">Agenda una sesión personalizada donde evaluamos la salud de tus folículos y diseñamos un plan de recuperación a medida.</p>`
  - CTA: `Button` `variant="secondary"` envuelto en `<Link href="/servicios">`, texto "Agendar Cita" + ícono `calendar_today` (Material Symbols SVGR). **Activo** (sin `disabled`, sin "Próximamente").

### G. Transversal
- Todos los headings usan clases `t-*` (cero `font-semibold`).
- Íconos migrados en este page (Material Symbols `svg-300/outlined`, `?react`): `local_shipping`, `location_on`, `verified_user`, `calendar_today`. Se elimina el import de lucide (`Package, MapPin, ShieldCheck`) de `page.tsx`.

## 4. Fuera de alcance de SP2

- Ruta `/galeria` real y datos de transformaciones (backend).
- Imágenes reales (hero, services banner) y su scrim de contraste (assets).
- Otras páginas (SP3–SP5).

## 5. Verificación

- `pnpm --filter @bymariap/storefront typecheck` + `lint` + `build` en verde.
- Revisión visual de `/` en `http://localhost:3000`:
  - Hero full-bleed con placeholder y texto a la izquierda, `t-hero` en serif light.
  - Trust: círculos tonales (peach/muted/surface-high), centrado, íconos Material Symbols, headings serif.
  - Sección "Nuestras transformaciones" visible con 3 cajas placeholder.
  - Featured con headings `t-display` y cards serif.
  - Services banner: card con placeholder, CTA marrón "Agendar Cita" activo que navega a `/servicios`.
  - Nav muestra "Galería" y ancla a la sección.
- Sin tests automatizados nuevos (cambios visuales): verificación por typecheck/build + visual.

## 6. Criterio de "hecho" (SP2)

- `page.tsx` reconstruido con las 5 secciones en orden Stitch; sin `font-semibold` en headings; sin imports de lucide.
- `header.tsx` con nav "Galería".
- 4 íconos del home en Material Symbols; sección transformaciones placeholder con `TODO(backend)`.
- `typecheck`/`lint`/`build` verdes y revisión visual sin regresiones.
