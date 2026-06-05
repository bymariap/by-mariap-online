# Spec — SP5a: Cuenta (login, perfil, pedidos, citas)

- **Fecha:** 2026-06-03
- **Tipo:** Diseño/spec (brainstorming). Implementación posterior vía plan.
- **Relacionado:** [Auditoría](../audits/2026-06-01-storefront-design-audit.md) (3.7–3.10) · [Decisiones](../audits/2026-06-01-storefront-design-decisions.md) · [SP1 spec](./2026-06-03-storefront-design-system-foundation-design.md)
- **Depende de:** SP1, SP1.1, SP2, SP3, SP4 (en `main`).

## 1. Contexto y objetivo

Alinear las páginas de cuenta con Stitch: `/login`, `/mi-cuenta` (perfil), `/mi-cuenta/pedidos`, `/mi-cuenta/citas`. Son páginas funcionales (auth, react-query, cancelación de citas ya hechas); SP5a es **fidelidad visual** + el enriquecimiento del perfil. **Toda la lógica se mantiene.** Los pills de estado ya quedaron tonales en SP1.

SP5 se dividió en **SP5a (Cuenta, este spec)** y **SP5b (Booking)**.

## 2. Decisiones aplicadas

- **Perfil enriquecido:** se añade `h1` "Mi Perfil" + sub-secciones itálicas; "Información Personal" con datos reales, y **"Dirección de Envío" y "Seguridad" como placeholders** (campos deshabilitados / skeleton + `TODO(backend)`).
- **Patrón transversal:** headings a `t-*` (cero `font-semibold`); cards de sombra a `rounded-xl` (G5). Sin migración de íconos (estas páginas no usan lucide).
- Lógica de auth / react-query / cancelación: **sin cambios**.

## 3. Diseño

### A. Login — `apps/storefront/src/app/login/page.tsx`
- Card contenedora: `w-full max-w-sm bg-white rounded-md p-8 space-y-6` → **`w-full max-w-md bg-white rounded-xl p-8 md:p-12 space-y-6`**.
- `h1` "Bienvenida de nuevo": `font-heading text-2xl font-semibold text-foreground` → **`t-display text-foreground`**.
- CTA submit: añadir `uppercase tracking-widest` a su `className` (`w-full h-12 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium … disabled:opacity-50`).
- Subtítulo, "Continuar como invitado", divisor, "¿Olvidaste tu contraseña?", "Regístrate": **sin cambios**.

### B. Perfil — `apps/storefront/src/app/mi-cuenta/page.tsx`
Reestructurar el contenido (mantener `useMe` y el guard):
- Nuevo `h1` **"Mi Perfil"** → `t-display text-foreground`.
- **Información Personal** (datos reales):
  - Sub-heading: `<h2 className="t-sub-italic text-foreground">Información Personal</h2>` + el párrafo descriptivo actual (`font-light`).
  - Los `InfoRow` actuales (Nombre, Correo electrónico, Teléfono) sin cambios de lógica.
  - Botón "Guardar cambios" deshabilitado: se mantiene.
- **Dirección de Envío** (placeholder):
  - `<h2 className="t-sub-italic text-foreground">Dirección de Envío</h2>`.
  - 3 barras skeleton (`div` `bg-muted rounded h-4 w-…`). `{/* TODO(backend): dirección guardada del usuario */}`.
- **Seguridad** (placeholder):
  - `<h2 className="t-sub-italic text-foreground">Seguridad</h2>`.
  - Una fila "Contraseña" con valor `••••••••` (texto estático) + botón "Cambiar contraseña" **deshabilitado** (`opacity-50 cursor-not-allowed`). `{/* TODO(backend): cambio de contraseña */}`.
- Las secciones se separan con `space-y-10`. `InfoRow` (helper actual) se mantiene.

### C. Mis pedidos — `apps/storefront/src/app/mi-cuenta/pedidos/page.tsx`
- `h1` "Mis pedidos" (en la lista y en el estado vacío): `font-heading text-2xl font-semibold text-foreground` → **`t-display text-foreground`**.
- Cada card de pedido (`<li className="bg-white rounded-md p-4 …">`): `rounded-md` → **`rounded-xl`**.
- `OrderStatusPill`, fecha, total, "Ver detalle", CTA del estado vacío: **sin cambios**.

### D. Mis citas — `apps/storefront/src/app/mi-cuenta/citas/page.tsx`
- `h1` "Mis citas" (lista y estado vacío): `font-heading text-2xl font-semibold text-foreground` → **`t-display text-foreground`**.
- Cada card de cita (`<li className="bg-white rounded-md p-4 …">`): `rounded-md` → **`rounded-xl`**.
- `AppointmentStatusPill`, fecha, especialista, botón "Cancelar" y su lógica: **sin cambios**.

### E. Layout de cuenta — `apps/storefront/src/app/mi-cuenta/layout.tsx`
- Sin cambios funcionales. El avatar de iniciales y el nav se mantienen. (No requiere edición para SP5a; se deja como está.)

## 4. Fuera de alcance de SP5a
- Edición real de perfil / dirección / contraseña (backend).
- SP5b (booking: servicios, detalle de servicio, BookingForm, date-slot-picker).

## 5. Verificación
- `pnpm --filter @bymariap/storefront typecheck` + `build` en verde. (`lint` se omite por el problema de entorno conocido.)
- Visual:
  - **/login:** card más ancha (`max-w-md`), radio `xl`, `h1` serif grande; CTA en mayúsculas; login y "continuar como invitado" funcionan.
  - **/mi-cuenta:** `h1` "Mi Perfil"; 3 sub-secciones itálicas (Información Personal con datos reales; Dirección y Seguridad como placeholders inertes).
  - **/mi-cuenta/pedidos** y **/mi-cuenta/citas:** `h1` serif grande; cards `rounded-xl`; pills tonales; acciones (ver detalle / cancelar) funcionan.
- Sin tests automatizados nuevos (cambios visuales sobre lógica existente).

## 6. Criterio de "hecho" (SP5a)
- Login con card `max-w-md rounded-xl` y `h1` `t-display`.
- Perfil con "Mi Perfil" + 3 sub-secciones (Información real + Dirección/Seguridad placeholder con `TODO(backend)`).
- Pedidos y citas con `h1` `t-display` y cards `rounded-xl`.
- `typecheck`/`build` verdes y revisión visual sin regresiones funcionales.
