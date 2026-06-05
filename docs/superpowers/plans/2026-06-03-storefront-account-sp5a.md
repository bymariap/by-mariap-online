# SP5a — Cuenta (storefront) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinear las páginas de cuenta (`/login`, `/mi-cuenta`, `/mi-cuenta/pedidos`, `/mi-cuenta/citas`) con Stitch: tipografía `t-*`, cards `rounded-xl`, login más ancho y perfil enriquecido con sub-secciones.

**Architecture:** Ediciones visuales puntuales en login, pedidos y citas (lógica intacta); reescritura de `mi-cuenta/page.tsx` para añadir "Mi Perfil" + sub-secciones (Información real + Dirección/Seguridad placeholder). Sin componentes nuevos ni migración de íconos.

**Tech Stack:** Next 15, React 19, Tailwind 3.4, pnpm, `@tanstack/react-query`.

**Spec:** [`docs/superpowers/specs/2026-06-03-storefront-account-sp5a-design.md`](../specs/2026-06-03-storefront-account-sp5a-design.md)

**Convenciones:**
- Comandos desde la raíz del monorepo `C:\Users\Theodoro\Documents\by-mariap-online`; paquete `@bymariap/storefront`.
- **Commits sin** trailer `Co-Authored-By`. **No** convertir line endings a CRLF.
- WIP previo en `apps/admin/*` no relacionado: **no** incluirlo (nombrar archivos exactos en cada `git add`).
- **No** usar `lint` como verificación (roto en el entorno). Verificar con `typecheck` + `build` + visual.

---

## Task 0: Rama de trabajo

**Files:** —

- [ ] **Step 1: Crear la rama desde main**

Run:
```bash
git checkout -b feat/storefront-account
```
Expected: `Switched to a new branch 'feat/storefront-account'`

---

## Task 1: Login (ediciones puntuales)

**Files:**
- Modify: `apps/storefront/src/app/login/page.tsx`

- [ ] **Step 1: Card más ancha y `rounded-xl`**

Reemplazar:
```tsx
        className="w-full max-w-sm bg-white rounded-md p-8 space-y-6"
```
por:
```tsx
        className="w-full max-w-md bg-white rounded-xl p-8 md:p-12 space-y-6"
```

- [ ] **Step 2: Título a `t-display`**

Reemplazar:
```tsx
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Bienvenida de nuevo
          </h1>
```
por:
```tsx
          <h1 className="t-display text-foreground">Bienvenida de nuevo</h1>
```

- [ ] **Step 3: CTA en mayúsculas**

Reemplazar:
```tsx
            className="w-full h-12 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
```
por:
```tsx
            className="w-full h-12 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
```

- [ ] **Step 4: Verificar typecheck y commit**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

```bash
git add apps/storefront/src/app/login/page.tsx
git commit -m "feat(storefront): restyle login (wider rounded-xl card, serif h1, uppercase CTA)"
```

---

## Task 2: Perfil (reemplazo completo)

**Files:**
- Modify: `apps/storefront/src/app/mi-cuenta/page.tsx` (reemplazo completo)

- [ ] **Step 1: Reemplazar el contenido de `mi-cuenta/page.tsx`**

Reemplazar **todo** `apps/storefront/src/app/mi-cuenta/page.tsx` por:

```tsx
'use client';

import { useMe } from '@/lib/auth/hooks';

export default function ProfilePage() {
  const me = useMe();

  // Auth guard is handled by layout; just show loading if data not yet ready
  if (me.isLoading || !me.data) return null;

  return (
    <div className="space-y-10 max-w-lg">
      <h1 className="t-display text-foreground">Mi Perfil</h1>

      {/* Información Personal (datos reales) */}
      <section className="space-y-4">
        <div>
          <h2 className="t-sub-italic text-foreground">Información Personal</h2>
          <p className="text-sm font-body font-light text-muted-foreground mt-1">
            Gestiona tu información personal y preferencias para una experiencia
            más personalizada en nuestro atelier.
          </p>
        </div>
        <div className="space-y-4">
          <InfoRow label="Nombre" value={me.data.fullName} />
          <InfoRow label="Correo electrónico" value={me.data.email} />
          {me.data.phone && <InfoRow label="Teléfono" value={me.data.phone} />}
        </div>
        <button
          disabled
          className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-body font-medium text-sm opacity-50 cursor-not-allowed"
        >
          Guardar cambios
        </button>
      </section>

      {/* Dirección de Envío (placeholder) */}
      <section className="space-y-4">
        <h2 className="t-sub-italic text-foreground">Dirección de Envío</h2>
        {/* TODO(backend): dirección guardada del usuario */}
        <div className="space-y-2">
          <div className="bg-muted rounded h-4 w-3/4" />
          <div className="bg-muted rounded h-4 w-1/2" />
          <div className="bg-muted rounded h-4 w-2/3" />
        </div>
      </section>

      {/* Seguridad (placeholder) */}
      <section className="space-y-4">
        <h2 className="t-sub-italic text-foreground">Seguridad</h2>
        {/* TODO(backend): cambio de contraseña */}
        <InfoRow label="Contraseña" value="••••••••" />
        <button
          disabled
          className="h-11 px-6 rounded-full border border-border font-body text-sm text-foreground opacity-50 cursor-not-allowed"
        >
          Cambiar contraseña
        </button>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-body text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-body text-foreground">{value}</p>
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/app/mi-cuenta/page.tsx
git commit -m "feat(storefront): enrich profile (Mi Perfil + italic sub-sections, address/security placeholders)"
```

---

## Task 3: Mis pedidos (ediciones puntuales)

**Files:**
- Modify: `apps/storefront/src/app/mi-cuenta/pedidos/page.tsx`

- [ ] **Step 1: Títulos a `t-display` (ambas ocurrencias)**

Hay **dos** `<h1>` "Mis pedidos" (estado vacío y lista) con **indentación distinta**, pero el mismo `className`. Reemplazar el `className` (con `replace_all`, afecta solo a esos dos `<h1>`):

Reemplazar todas las ocurrencias de:
```tsx
className="font-heading text-2xl font-semibold text-foreground"
```
por:
```tsx
className="t-display text-foreground"
```
(Solo aparece en los dos `<h1>` de este archivo. Quedan multilínea, lo cual es válido.)

- [ ] **Step 2: Cards de pedido a `rounded-xl`**

Reemplazar:
```tsx
            className="bg-white rounded-md p-4 flex flex-col sm:flex-row sm:items-center gap-3"
```
por:
```tsx
            className="bg-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
```

- [ ] **Step 3: Verificar typecheck y commit**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

```bash
git add apps/storefront/src/app/mi-cuenta/pedidos/page.tsx
git commit -m "feat(storefront): restyle orders list (serif h1, rounded-xl cards)"
```

---

## Task 4: Mis citas (ediciones puntuales)

**Files:**
- Modify: `apps/storefront/src/app/mi-cuenta/citas/page.tsx`

- [ ] **Step 1: Títulos a `t-display` (ambas ocurrencias)**

Hay **dos** `<h1>` "Mis citas" idénticos (estado vacío y lista). Reemplazar **ambas** ocurrencias de:
```tsx
      <h1 className="font-heading text-2xl font-semibold text-foreground">Mis citas</h1>
```
por:
```tsx
      <h1 className="t-display text-foreground">Mis citas</h1>
```
(En el editor: usar reemplazo global / `replace_all` para este fragmento.)

- [ ] **Step 2: Cards de cita a `rounded-xl`**

Reemplazar:
```tsx
            <li key={a.id} className="bg-white rounded-md p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ boxShadow: '0 20px 40px rgba(48,51,46,0.05)' }}>
```
por:
```tsx
            <li key={a.id} className="bg-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ boxShadow: '0 20px 40px rgba(48,51,46,0.05)' }}>
```

- [ ] **Step 3: Verificar typecheck/build y commit**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

Run: `pnpm --filter @bymariap/storefront build`
Expected: build exitoso.

```bash
git add apps/storefront/src/app/mi-cuenta/citas/page.tsx
git commit -m "feat(storefront): restyle appointments list (serif h1, rounded-xl cards)"
```

---

## Task 5: Verificación final (typecheck + build + visual)

**Files:** —

- [ ] **Step 1: Typecheck y build**

Run:
```bash
pnpm --filter @bymariap/storefront typecheck
pnpm --filter @bymariap/storefront build
```
Expected: ambos en verde (exit 0).

- [ ] **Step 2: Revisión visual manual**

Run: `pnpm --filter @bymariap/storefront dev`

Verificar en `http://localhost:3000`:
- **/login:** card más ancha (`max-w-md`) con radio `xl` y padding amplio; `h1` "Bienvenida de nuevo" en serif **light** grande; CTA "Iniciar sesión" en mayúsculas; login y "Continuar como invitado" funcionan.
- **/mi-cuenta** (autenticado): `h1` "Mi Perfil"; sub-secciones itálicas **Información Personal** (con datos reales), **Dirección de Envío** (barras skeleton) y **Seguridad** (contraseña `••••••••` + botón deshabilitado).
- **/mi-cuenta/pedidos** y **/mi-cuenta/citas:** `h1` en serif grande; cards `rounded-xl`; pills tonales; "Ver detalle" / "Cancelar" funcionan.

> Nota: las rutas de cuenta requieren sesión; si no hay login, redirigen a `/login` (comportamiento esperado).

- [ ] **Step 3: Confirmar estado de git**

Run: `git log --oneline feat/storefront-account -5`
Expected: 4 commits (Tasks 1–4), sin archivos de `apps/admin`.

> No hay commit en esta tarea: solo verificación. La integración de la rama se decide al cerrar SP5a con el usuario.

---

## Notas de cierre

- `mi-cuenta/layout.tsx` no se modifica en SP5a (el sidebar/avatar se deja como está).
- Al terminar SP5a queda **SP5b (Booking)** para cerrar el roadmap: `/servicios`, `/servicios/[slug]` + `BookingForm`, `service-card`, `date-slot-picker` (incluye unificar los inputs del booking con `<Input>` y `focus:ring-accent`).
