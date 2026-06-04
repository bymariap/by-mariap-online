# Spec — SP1.1: Tokens de color a canales RGB (fix de opacidad)

- **Fecha:** 2026-06-03
- **Tipo:** Fix de fundación (corrige SP1). Diseño/spec → plan → ejecución.
- **Relacionado:** [SP1 spec](./2026-06-03-storefront-design-system-foundation-design.md) · [Decisiones](../audits/2026-06-01-storefront-design-decisions.md) (D5)
- **Orden:** ejecutar **antes** de implementar SP3a.

## 1. Problema

Los tokens de color se definen como variables CSS con **hex** y se referencian con `var(--x)` en `tailwind.config.ts`. Con ese formato, Tailwind 3 **descarta** los modificadores de opacidad: `bg-destructive/10`, `bg-primary/5`, etc. **no generan ninguna regla** (verificado compilando con la config real → la clase no existe en el CSS).

La documentación oficial de Tailwind v3 (*Customizing Colors → "Using CSS variables"*) prescribe que, cuando los colores se definen como variables CSS, deben guardarse como **canales** y referenciarse con `<alpha-value>`:

```css
--color-primary: 255 115 179;
```
```js
primary: 'rgb(var(--color-primary) / <alpha-value>)'
```

> Advertencia literal de la doc: *"Don't include the color space function or opacity modifiers won't work."* El formato actual del proyecto es exactamente el anti-patrón.

**Impacto actual** (sitios con `token/opacidad` que hoy quedan sin fondo):
- `src/components/order-status-pill.tsx:10` — `bg-destructive/10` (Cancelado).
- `src/components/appointment-status-pill.tsx:7-8` — `bg-destructive/10` (Cancelada / No asistió).
- `src/app/servicios/[slug]/booking-form.tsx:72` — `bg-primary/5` (especialista seleccionada).

**Impacto futuro:** el HTML de Stitch usa opacidad sobre tokens extensamente (`bg-secondary-container/50`, `bg-error-container/20`, `shadow-primary/10`, etc.); sin este fix, SP3b/SP4/SP5 fallarían al traducir.

## 2. Decisión

**Opción 1** (acordada): mantener la capa de variables CSS (coherente con D5 / dark mode futuro) y convertir los tokens de color a **canales RGB** + `rgb(var(--x) / <alpha-value>)`. No se renuncia a las variables; solo cambia su formato.

## 3. Cambios

### 3.1 `src/app/index.css` — valores de `:root` a tripletas RGB
Convertir **solo las variables de color** (las de `--radius-*`, `--font-*`, `--container-max-width` **no se tocan**):

| Variable | Antes (hex) | Después (canales) |
|---|---|---|
| `--background` | `#fbf9f5` | `251 249 245` |
| `--foreground` | `#30332e` | `48 51 46` |
| `--border` | `#b1b3ab` | `177 179 171` |
| `--primary` | `#5f5e5e` | `95 94 94` |
| `--primary-foreground` | `#faf7f6` | `250 247 246` |
| `--muted` | `#f5f4ef` | `245 244 239` |
| `--muted-foreground` | `#5d605a` | `93 96 90` |
| `--accent` | `#705b44` | `112 91 68` |
| `--accent-foreground` | `#fff7f3` | `255 247 243` |
| `--accent-container` | `#fadec0` | `250 222 192` |
| `--accent-container-foreground` | `#624e38` | `98 78 56` |
| `--destructive` | `#9e422c` | `158 66 44` |
| `--destructive-foreground` | `#fff7f6` | `255 247 246` |
| `--surface` | `#eeeee8` | `238 238 232` |
| `--surface-lowest` | `#ffffff` | `255 255 255` |
| `--surface-high` | `#e2e3db` | `226 227 219` |

### 3.2 `tailwind.config.ts` — envolver cada color en `rgb(var(--x) / <alpha-value>)`
Cada entrada `"var(--x)"` pasa a `"rgb(var(--x) / <alpha-value>)"`. Afecta: `background`, `foreground`, `border`, `primary` (DEFAULT + foreground), `muted` (DEFAULT + foreground), `accent` (DEFAULT + foreground + container + container-foreground), `destructive` (DEFAULT + foreground), `surface` (DEFAULT + lowest + high). `borderRadius`, `fontFamily`, `maxWidth` **no cambian**.

## 4. Seguridad / supuestos
- Verificado: **no hay usos crudos** de `var(--<color>)` fuera de Tailwind en `src` (un grep no devolvió coincidencias), así que pasar a canales no rompe ningún color usado directamente en CSS/inline.
- Estilos inline con literales (`rgba(48,51,46,0.05)`, `#fadec0` en el carrito) son independientes y no se tocan en SP1.1.

## 5. Verificación
- `pnpm --filter @bymariap/storefront typecheck` + `lint` + `build` en verde.
- **Prueba de opacidad (objetiva):** compilar una clase de prueba con la config real y confirmar que `bg-destructive/10` **ahora sí genera** una regla con alpha (antes generaba nada):
  ```bash
  cd apps/storefront
  printf '@tailwind utilities;' > /tmp/in.css
  printf '<div class="bg-destructive/10 bg-primary/5"></div>' > /tmp/probe.html
  npx tailwindcss -i /tmp/in.css -c ./tailwind.config.ts --content /tmp/probe.html -o /tmp/out.css
  cat /tmp/out.css   # debe contener .bg-destructive\/10 con rgb(var(--destructive) / 0.1)
  ```
- **Visual:** los colores **sólidos** se ven idénticos (sin regresión); en `/mi-cuenta/pedidos`/`/mi-cuenta/citas` un estado "Cancelado/Cancelada" muestra un **pill con tinte rojo suave** (antes sin fondo).

## 6. Criterio de "hecho"
- Todas las variables de color en canales RGB; config envuelta en `rgb(var(--x) / <alpha-value>)`.
- `bg-destructive/10` (y demás `/opacidad`) generan regla con alpha.
- Sólidos sin cambios visuales; `typecheck`/`lint`/`build` verdes.
