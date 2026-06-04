# Decisiones de diseño — storefront (triage post-auditoría)

- **Fecha:** 2026-06-01
- **Contexto:** Triage de las preguntas abiertas de la [auditoría de diseño](./2026-06-01-storefront-design-audit.md). Cierra el alcance antes de pasar al plan de implementación.
- **Estado:** Aprobado. Solo documentación; no se ha tocado código de la app.

---

## 1. Decisiones cerradas

| # | Tema | Decisión | Justificación | Implicación |
|---|---|---|---|---|
| D1 | **Color primario** | `--primary: #5f5e5e` (taupe de Stitch) en vez de `#1a1a1a`. | Alta fidelidad con el diseño Stitch. | Afecta **todos** los CTAs primarios, filtro de categoría activo, `OrderStatusPill`, círculos numerados de checkout, etc. (G3). |
| D2 | **Librería de íconos** | **Material Symbols vía SVG** (p.ej. `@material-symbols/svg-400`), importados por ícono. **No** usar la icon-font. Migración incremental desde lucide. | Mismo glyph exacto que Stitch (`local_shipping`, `calendar_today`…) con tree-shaking y sin FOUT ni descarga de fuente. | lucide y Material Symbols conviven durante la migración. (G9, 3.1.1) |
| D3 | **Secciones dependientes de backend** | **Posponer**, pero dejarlas **maquetadas** con placeholder y una **marca visible de "requiere backend"** (para QA, no para el cliente final). | Sin modelo de datos no se pueden poblar; pero el layout debe quedar listo. | Aplica a: detalle de producto (Cómo usar, Ingredientes, Reseñas/Resultados, Completa tu rutina, FAQ — 3.3) y home (Nuestras transformaciones — 3.1). |
| D4 | **Assets / imágenes** | **Cajas dimensionadas** con el `aspect-ratio`/tamaño del diseño y fondo placeholder (`bg-muted`), **sin imagen real** por ahora. | Permite dejar el layout correcto y solo "soltar" la imagen después. | Aplica a hero home, services banner (3.1.2), galería. |
| D5 | **Dark mode** | **No implementar en el MVP** (posponer). | Stitch **no tiene un dark mode real diseñado** (solo clases `dark:bg-stone-*` sueltas en nav/footer, sin paleta coherente). Diseñar una paleta dark M3 desde cero es esfuerzo desproporcionado para el MVP y sin referencia 1:1. | La fase de tokens se mantiene **solo light**. Dejar la arquitectura de tokens (variables CSS) lista para añadir dark después sin reescribir. |

## 2. Divergencias respecto a Stitch — resolución

| # | Divergencia | Resolución | Motivo |
|---|---|---|---|
| V1 | Checkout **sin formulario de tarjeta** (redirect a Wompi) | **Mantener** la implementación actual. **No** implementar los campos de tarjeta que dibuja Stitch. | Wompi es pasarela hosted/redirect; capturar tarjeta en página propia mete alcance **PCI-DSS** innecesario. El form de Stitch es un ideal que no aplica al caso real. |
| V2 | **Dark mode** ausente | **Posponer** (no en MVP, ver D5). | Sin referencia real de Stitch; esfuerzo desproporcionado para el MVP. |
| V3 | Booking en **2 páginas** (`/servicios` + `/servicios/[slug]`) vs 1 página de Stitch | **Mantener** la arquitectura de 2 páginas. | Defendible por SEO y por poder compartir el link de un servicio. No prioritario rehacer al flujo de 1 página. |
| V4 | Home: CTA **"Agendar Cita (Próximamente)"** deshabilitado | **Bug de fidelidad + inconsistencia funcional.** Activar el botón, estilo marrón (`secondary`) + ícono, enlazando a `/servicios`. | El booking **sí existe y funciona** (`/servicios` + `BookingForm` con backend). El "Próximamente" es código viejo previo a las citas. |

---

## 3. Impacto en el plan de implementación

El triage refuerza el enfoque "de raíz hacia las hojas". Fases tentativas:

1. **Fundación de tokens** — completar set de color (peach `secondary-container` + `tertiary-container` + `surface-container-highest`, G2), `--primary: #5f5e5e` (D1), radio `xl: 12px` (G5), pesos de fuente incl. Manrope 300 + itálica Noto Serif (G7). Solo light (D5: dark pospuesto). Exponer todo en `tailwind.config.ts`.
2. **Escala tipográfica** — headings display a peso `light`/`normal` + `tracking-tight` (G1). Resuelve discrepancias transversales de una vez.
3. **Componentes compartidos** — variante `secondary` en `Button`, `OrderStatusPill` tonal (G6), `ProductCard` serif, unificar `Input` en booking, adoptar íconos SVG (D2).
4. **Página por página** — home (hero con caja placeholder D4, trust 3.1.1, services banner 3.1.2, CTA V4), detalle de producto (secciones con placeholder D3), carrito, login, perfil, etc.
5. **Verificación** — QA visual contra Stitch + toggle de dark mode por pantalla.

> **Nota de alcance:** Dark mode (D5) queda **fuera del MVP**. La fase de tokens debe dejar la arquitectura de variables CSS preparada para añadir dark más adelante sin reescribir.
