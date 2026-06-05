# Spec — SP5b: Booking (servicios, detalle de servicio, reserva)

- **Fecha:** 2026-06-03
- **Tipo:** Diseño/spec (brainstorming). Implementación posterior vía plan.
- **Relacionado:** [Auditoría](../audits/2026-06-01-storefront-design-audit.md) (3.10) · [Decisiones](../audits/2026-06-01-storefront-design-decisions.md) · [SP1 spec](./2026-06-03-storefront-design-system-foundation-design.md)
- **Depende de:** SP1, SP1.1, SP2, SP3, SP4, SP5a (en `main`). **Cierra el roadmap.**

## 1. Contexto y objetivo

Alinear el flujo de reserva con Stitch: `/servicios`, `/servicios/[slug]` + `BookingForm`, `service-card`, `date-slot-picker`. Incluye reemplazar el `<input type="date">` por un calendario mensual propio, enriquecer `/servicios` con hero + especialistas, y unificar la consistencia de los inputs del booking. **Toda la lógica de reserva/slots/cancelación se mantiene.**

## 2. Decisiones aplicadas

- **Date picker (decisión B):** mini-calendario mensual **propio en el storefront** (matemática con `Date` nativo, sin `date-fns`), no se reutiliza el componente del admin (su UX es de agenda, no de picker) ni se crea paquete compartido.
- **Servicios enriquecida:** hero/encabezado + sección "Tu Especialista" (datos reales de `/store/specialists`).
- **Patrón transversal:** `t-*`, cards `rounded-xl`, íconos Material Symbols (D2), `focus:ring-accent`.
- **Fuera:** avatares/imágenes reales (placeholder D4); bio de especialista (no existe en el endpoint).

## 3. Diseño

### A. Date picker — `apps/storefront/src/components/date-slot-picker.tsx` (reescritura)
Mantener la firma (`{ serviceId, specialistId, value, onChange }`) y la query de slots existente (`bookingApi.slots(serviceId, specialistId, date)` con `date` `yyyy-MM-dd`). Reemplazar el `<input type="date">` por un calendario:

- **Estado:** `viewMonth` (Date al primer día del mes visible, inicial = mes actual) y el `date` seleccionado (`yyyy-MM-dd`, inicial = hoy en `America/Bogota` vía `toISOString().slice(0,10)` como hoy).
- **Matemática (helpers locales con `Date` nativo):**
  - `startOfMonth(d)`, `daysInMonth(d)`, día de semana del primer día con **lunes = 0** (`(getDay()+6)%7`).
  - Grilla: relleno inicial (días del mes anterior como celdas vacías) + días 1..N.
- **UI:**
  - Header: `‹` (mes anterior, deshabilitado si `viewMonth` es el mes actual) + `Mes Año` (es-CO, `Intl.DateTimeFormat`) + `›` (mes siguiente).
  - Fila de días: `L M M J V S D` (`grid grid-cols-7 text-xs text-muted-foreground`).
  - Grilla `grid grid-cols-7 gap-1` de botones-día (`h-10 rounded-full text-sm`):
    - Día **pasado** (< hoy): `disabled`, `text-muted-foreground/40`.
    - Día **seleccionado**: `bg-primary text-primary-foreground`.
    - Resto: `hover:bg-muted`.
  - Al click en un día válido: `setDate(ymd)` + `onChange("")` (limpia el slot elegido, como hoy al cambiar fecha).
- **Slots:** debajo del calendario, los bloques Mañana/Tarde existentes (misma lógica `morning`/`afternoon`), con el slot seleccionado en `bg-primary text-primary-foreground border-primary` (igual que hoy). Estados "Cargando…"/"No hay disponibilidad" se mantienen.

### B. Servicios — `apps/storefront/src/app/servicios/page.tsx` (enriquecida)
- `getServices()` actual se mantiene; añadir `getSpecialists()`: `fetch(`${BASE}/store/specialists`)` → `{ id, user: { fullName }, specialties: string[], avatarUrl: string | null }[]` (try/catch → `[]`).
- **Hero:** `t-eyebrow` "Cuidado en Estudio" + `<h1 className="t-hero text-foreground">Agenda tu cita</h1>` + subtítulo `font-body text-base md:text-lg font-light text-muted-foreground` (copy: "Diseño y recuperación experta con nuestras especialistas en El Poblado.").
- **Grid de servicios:** `<h2 className="t-display text-foreground">Servicios</h2>` + grid actual con `ServiceCard`. Estado vacío se mantiene.
- **"Tu Especialista":** si hay especialistas, `<h2 className="t-display text-foreground">Tu Especialista</h2>` + grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6` de `<SpecialistCard>`.

### C. SpecialistCard — `apps/storefront/src/components/specialist-card.tsx` (nuevo)
- Props: `{ specialist: { id; user: { fullName }; specialties: string[]; avatarUrl: string | null } }`.
- Render: card `bg-white rounded-xl p-6` (sombra inline como las otras) centrado: avatar (`h-20 w-20 rounded-full overflow-hidden bg-muted`; si `avatarUrl` → `<Image>`, si no → caja vacía, `{/* TODO(asset): foto del especialista */}`) + `<p className="font-heading text-lg text-foreground mt-4">{fullName}</p>` + especialidades (`text-sm font-body text-muted-foreground`, unidas por " · ").

### D. Detalle de servicio — `apps/storefront/src/app/servicios/[slug]/page.tsx`
- `h1` "{service.name}": `font-heading text-4xl font-semibold` → **`t-display`**.
- Precio: `font-heading text-2xl text-foreground` (se mantiene); duración y descripción → `font-light`.
- Layout 2-col (info + `BookingForm`) sin cambios estructurales.

### E. BookingForm — `apps/storefront/src/app/servicios/[slug]/booking-form.tsx`
- Card contenedora: `rounded-md` → **`rounded-xl`**; heading "Agenda tu cita" → **`t-section`**.
- **Consistencia:** reemplazar **todas** las ocurrencias `focus:ring-primary` → `focus:ring-accent` (inputs y textarea).
- Selector de especialista seleccionado: `border-primary bg-primary/5` → `border-accent bg-accent/10` (opacidad funciona tras SP1.1).
- CTA "Confirmar cita": añadir `uppercase tracking-widest`.
- Lógica de submit/validación/guest fields/`DateSlotPicker`: intacta.

### F. ServiceCard — `apps/storefront/src/components/service-card.tsx`
- Card: `rounded-md` → **`rounded-xl`**.
- `h3`: `font-heading text-lg font-semibold` → **`font-heading text-xl text-foreground`**.
- Ícono `Clock` (lucide) → `@material-symbols/svg-300/outlined/schedule.svg?react` (`<Schedule className="h-3.5 w-3.5" />`); quitar import de lucide.
- CTA "Seleccionar" y datos (duración/precio): sin cambios de lógica.

## 4. Fuera de alcance de SP5b
- Avatares/imágenes reales (placeholder D4).
- Bio de especialista (no está en `/store/specialists`).
- Reutilización del calendario del admin / paquete compartido (decisión B: picker propio).

## 5. Verificación
- `pnpm --filter @bymariap/storefront typecheck` + `build` en verde. (`lint` se omite por el problema de entorno conocido.)
- Visual:
  - **/servicios:** hero serif + grid de servicios (cards `text-xl`, `rounded-xl`) + "Tu Especialista" con cards reales (nombre + especialidades).
  - **/servicios/[slug]:** `h1` serif light; `BookingForm` con card `rounded-xl`, selector de especialista con tinte accent, **calendario mensual** navegable (pasados deshabilitados, día seleccionado resaltado) que carga slots; reserva end-to-end funciona (toast de éxito → redirige a `/mi-cuenta/citas`).
- Sin tests automatizados nuevos.

## 6. Criterio de "hecho" (SP5b)
- `date-slot-picker` con calendario mensual propio funcional (sin `date-fns`).
- `/servicios` con hero + "Tu Especialista" (real) + grid; `SpecialistCard` creado.
- Detalle de servicio, `BookingForm` (ring-accent, rounded-xl, CTA mayúsculas) y `ServiceCard` (text-xl, rounded-xl, ícono MS) reestilizados.
- `typecheck`/`build` verdes y reserva sin regresión funcional.
