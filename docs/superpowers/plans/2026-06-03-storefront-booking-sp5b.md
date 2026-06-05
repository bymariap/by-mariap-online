# SP5b — Booking (storefront) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinear el flujo de reserva con Stitch: calendario mensual propio en el date-picker, `/servicios` con hero + especialistas, y reestilizar detalle de servicio, `BookingForm` y `ServiceCard`.

**Architecture:** Reescritura de `date-slot-picker.tsx` (calendario con `Date` nativo) y `servicios/page.tsx` (hero + especialistas + grid); componente nuevo `specialist-card.tsx`; ediciones puntuales en `servicios/[slug]/page.tsx` y `booking-form.tsx`; reescritura de `service-card.tsx`. Migración incremental de íconos. Lógica de reserva intacta.

**Tech Stack:** Next 15 (webpack), React 19, Tailwind 3.4, pnpm, `@tanstack/react-query`, `@material-symbols/svg-300` + SVGR.

**Spec:** [`docs/superpowers/specs/2026-06-03-storefront-booking-sp5b-design.md`](../specs/2026-06-03-storefront-booking-sp5b-design.md)

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
git checkout -b feat/storefront-booking
```
Expected: `Switched to a new branch 'feat/storefront-booking'`

---

## Task 1: DateSlotPicker — calendario mensual (reemplazo completo)

**Files:**
- Modify: `apps/storefront/src/components/date-slot-picker.tsx` (reemplazo completo)

- [ ] **Step 1: Reemplazar el contenido de `date-slot-picker.tsx`**

Reemplazar **todo** `apps/storefront/src/components/date-slot-picker.tsx` por:

```tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookingApi } from '@/lib/booking/api';
import { cn } from '@/lib/cn';

interface Props {
  serviceId: string;
  specialistId: string;
  value: string | null;
  onChange: (startAt: string) => void;
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DateSlotPicker({ serviceId, specialistId, value, onChange }: Props) {
  const todayDate = new Date();
  const today = ymd(todayDate);
  const [date, setDate] = useState(today);
  const [viewMonth, setViewMonth] = useState(
    new Date(todayDate.getFullYear(), todayDate.getMonth(), 1),
  );

  const { data: slots, isLoading } = useQuery({
    queryKey: ['slots', serviceId, specialistId, date],
    queryFn: () => bookingApi.slots(serviceId, specialistId, date),
    enabled: Boolean(specialistId),
  });

  const morning =
    slots?.filter((s) => parseInt(s.localTime.split(':')[0]) < 12) ?? [];
  const afternoon =
    slots?.filter((s) => parseInt(s.localTime.split(':')[0]) >= 12) ?? [];

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  const isCurrentMonth =
    year === todayDate.getFullYear() && month === todayDate.getMonth();
  const monthLabel = new Intl.DateTimeFormat('es-CO', {
    month: 'long',
    year: 'numeric',
  }).format(viewMonth);

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={isCurrentMonth}
            onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted text-foreground disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <p className="font-heading text-base text-foreground capitalize">
            {monthLabel}
          </p>
          <button
            type="button"
            onClick={() => setViewMonth(new Date(year, month + 1, 1))}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted text-foreground"
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-body text-muted-foreground">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const key = ymd(d);
            const isPast = key < today;
            const isSelected = key === date;
            return (
              <button
                key={i}
                type="button"
                disabled={isPast}
                onClick={() => {
                  setDate(key);
                  onChange('');
                }}
                className={cn(
                  'h-10 rounded-full text-sm font-body transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : isPast
                      ? 'text-muted-foreground/40 cursor-not-allowed'
                      : 'text-foreground hover:bg-muted',
                )}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots */}
      {isLoading && (
        <p className="text-sm font-body text-muted-foreground">Cargando horarios…</p>
      )}

      {slots && slots.length === 0 && (
        <p className="text-sm font-body text-muted-foreground">
          No hay disponibilidad para esta fecha.
        </p>
      )}

      {morning.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wide">
            Mañana
          </p>
          <div className="flex flex-wrap gap-2">
            {morning.map((s) => (
              <button
                key={s.startAt}
                type="button"
                onClick={() => onChange(s.startAt)}
                className={cn(
                  'h-10 px-4 rounded-full border text-sm font-body transition-colors',
                  value === s.startAt
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-foreground hover:bg-muted',
                )}
              >
                {s.localTime}
              </button>
            ))}
          </div>
        </div>
      )}

      {afternoon.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wide">
            Tarde
          </p>
          <div className="flex flex-wrap gap-2">
            {afternoon.map((s) => (
              <button
                key={s.startAt}
                type="button"
                onClick={() => onChange(s.startAt)}
                className={cn(
                  'h-10 px-4 rounded-full border text-sm font-body transition-colors',
                  value === s.startAt
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-foreground hover:bg-muted',
                )}
              >
                {s.localTime}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/date-slot-picker.tsx
git commit -m "feat(storefront): month calendar date picker (native Date, no deps)"
```

---

## Task 2: SpecialistCard (nuevo)

**Files:**
- Create: `apps/storefront/src/components/specialist-card.tsx`

- [ ] **Step 1: Crear el componente**

Crear `apps/storefront/src/components/specialist-card.tsx` con:

```tsx
import Image from "next/image";

export interface SpecialistSummary {
  id: string;
  user: { fullName: string };
  specialties: string[];
  avatarUrl: string | null;
}

export function SpecialistCard({ specialist }: { specialist: SpecialistSummary }) {
  return (
    <div
      className="bg-white rounded-xl p-6 text-center"
      style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
    >
      <div className="h-20 w-20 rounded-full overflow-hidden bg-muted mx-auto">
        {/* TODO(asset): foto del especialista (placeholder cuando avatarUrl es null) */}
        {specialist.avatarUrl ? (
          <Image
            src={specialist.avatarUrl}
            alt={specialist.user.fullName}
            width={160}
            height={160}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <p className="font-heading text-lg text-foreground mt-4">
        {specialist.user.fullName}
      </p>
      {specialist.specialties.length > 0 && (
        <p className="text-sm font-body text-muted-foreground mt-1">
          {specialist.specialties.join(" · ")}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/specialist-card.tsx
git commit -m "feat(storefront): add SpecialistCard"
```

---

## Task 3: Servicios — hero + especialistas (reemplazo completo)

**Files:**
- Modify: `apps/storefront/src/app/servicios/page.tsx` (reemplazo completo)

- [ ] **Step 1: Reemplazar el contenido de `servicios/page.tsx`**

Reemplazar **todo** `apps/storefront/src/app/servicios/page.tsx` por:

```tsx
import type { Metadata } from "next";
import type { ServiceDTO } from "@bymariap/types";
import { ServiceCard } from "@/components/service-card";
import {
  SpecialistCard,
  type SpecialistSummary,
} from "@/components/specialist-card";

export const revalidate = 60;
export const metadata: Metadata = { title: "Servicios · By MariaP" };

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function getServices(): Promise<ServiceDTO[]> {
  try {
    const res = await fetch(`${BASE}/store/services`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getSpecialists(): Promise<SpecialistSummary[]> {
  try {
    const res = await fetch(`${BASE}/store/specialists`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function ServiciosPage() {
  const [services, specialists] = await Promise.all([
    getServices(),
    getSpecialists(),
  ]);

  return (
    <div className="container py-12 space-y-20">
      {/* Hero */}
      <header className="max-w-2xl space-y-4">
        <p className="t-eyebrow">Cuidado en Estudio</p>
        <h1 className="t-hero text-foreground">Agenda tu cita</h1>
        <p className="font-body text-base md:text-lg font-light text-muted-foreground">
          Diseño y recuperación experta con nuestras especialistas en El Poblado.
        </p>
      </header>

      {/* Services */}
      <section className="space-y-8">
        <h2 className="t-display text-foreground">Servicios</h2>
        {services.length === 0 ? (
          <p className="text-sm font-body text-muted-foreground">
            No hay servicios disponibles.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        )}
      </section>

      {/* Specialists */}
      {specialists.length > 0 && (
        <section className="space-y-8">
          <h2 className="t-display text-foreground">Tu Especialista</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {specialists.map((sp) => (
              <SpecialistCard key={sp.id} specialist={sp} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/app/servicios/page.tsx
git commit -m "feat(storefront): enrich services page (hero + specialists section)"
```

---

## Task 4: Detalle de servicio (ediciones puntuales)

**Files:**
- Modify: `apps/storefront/src/app/servicios/[slug]/page.tsx`

- [ ] **Step 1: Título a `t-display`**

Reemplazar:
```tsx
          <h1 className="font-heading text-4xl font-semibold text-foreground">{service.name}</h1>
```
por:
```tsx
          <h1 className="t-display text-foreground">{service.name}</h1>
```

- [ ] **Step 2: Duración en peso ligero**

Reemplazar:
```tsx
          <p className="text-sm font-body text-muted-foreground">{service.durationMinutes} minutos</p>
```
por:
```tsx
          <p className="text-sm font-body font-light text-muted-foreground">{service.durationMinutes} minutos</p>
```

- [ ] **Step 3: Descripción en peso ligero**

Reemplazar:
```tsx
            <p className="text-sm font-body text-muted-foreground whitespace-pre-line">{service.description}</p>
```
por:
```tsx
            <p className="text-sm font-body font-light text-muted-foreground whitespace-pre-line">{service.description}</p>
```

- [ ] **Step 4: Verificar typecheck y commit**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

```bash
git add "apps/storefront/src/app/servicios/[slug]/page.tsx"
git commit -m "feat(storefront): restyle service detail headings"
```

---

## Task 5: BookingForm (ediciones puntuales)

**Files:**
- Modify: `apps/storefront/src/app/servicios/[slug]/booking-form.tsx`

- [ ] **Step 1: Card `rounded-xl`**

Reemplazar:
```tsx
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white rounded-md p-6" style={{ boxShadow: '0 20px 40px rgba(48,51,46,0.05)' }}>
```
por:
```tsx
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white rounded-xl p-6" style={{ boxShadow: '0 20px 40px rgba(48,51,46,0.05)' }}>
```

- [ ] **Step 2: Heading a `t-section`**

Reemplazar:
```tsx
      <h2 className="font-heading text-xl font-semibold text-foreground">Agenda tu cita</h2>
```
por:
```tsx
      <h2 className="t-section text-foreground">Agenda tu cita</h2>
```

- [ ] **Step 3: Tinte accent en el especialista seleccionado**

Reemplazar:
```tsx
'border-primary bg-primary/5 text-foreground'
```
por:
```tsx
'border-accent bg-accent/10 text-foreground'
```

- [ ] **Step 4: Focus ring a `accent` (todas las ocurrencias)**

Reemplazar **todas** las ocurrencias (con `replace_all`) de:
```tsx
focus:ring-primary
```
por:
```tsx
focus:ring-accent
```

- [ ] **Step 5: CTA en mayúsculas**

Reemplazar:
```tsx
        className="w-full h-12 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
```
por:
```tsx
        className="w-full h-12 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50">
```

- [ ] **Step 6: Verificar typecheck y commit**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

```bash
git add "apps/storefront/src/app/servicios/[slug]/booking-form.tsx"
git commit -m "feat(storefront): restyle BookingForm (rounded-xl, accent focus/selection, uppercase CTA)"
```

---

## Task 6: ServiceCard (reemplazo completo)

**Files:**
- Modify: `apps/storefront/src/components/service-card.tsx` (reemplazo completo)

- [ ] **Step 1: Reemplazar el contenido de `service-card.tsx`**

Reemplazar **todo** `apps/storefront/src/components/service-card.tsx` por:

```tsx
import Link from "next/link";
import Schedule from "@material-symbols/svg-300/outlined/schedule.svg?react";
import type { ServiceDTO } from "@bymariap/types";
import { formatCop } from "@/lib/format";

export function ServiceCard({ service }: { service: ServiceDTO }) {
  return (
    <div
      className="bg-white rounded-xl p-6 flex flex-col gap-4"
      style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
    >
      <div>
        <h3 className="font-heading text-xl text-foreground">{service.name}</h3>
        {service.description && (
          <p className="mt-1 text-sm font-body text-muted-foreground line-clamp-2">
            {service.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm font-body text-muted-foreground">
        <span className="flex items-center gap-1">
          <Schedule className="h-3.5 w-3.5" />
          {service.durationMinutes} min
        </span>
        <span className="font-medium text-foreground">
          {formatCop(service.priceCop)}
        </span>
      </div>
      <Link
        href={`/servicios/${service.slug}`}
        className="inline-flex h-11 items-center justify-center rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Seleccionar
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck y build**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores.

Run: `pnpm --filter @bymariap/storefront build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/service-card.tsx
git commit -m "feat(storefront): restyle ServiceCard (rounded-xl, text-xl, Material Symbols icon)"
```

---

## Task 7: Verificación final (typecheck + build + visual)

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
- **/servicios:** hero serif ("Agenda tu cita") + grid de servicios (cards `rounded-xl`, título `text-xl`, ícono Material Symbols) + sección "Tu Especialista" con cards reales (nombre + especialidades; avatar placeholder si no hay foto). Si no hay especialistas, esa sección no aparece.
- **/servicios/[slug]:** `h1` serif light; `BookingForm` con card `rounded-xl`. Seleccionar una especialista → el **calendario mensual** aparece: navegar meses (‹ deshabilitado en el mes actual), días pasados deshabilitados, elegir un día resalta y carga los slots (Mañana/Tarde); elegir horario + datos → "Confirmar cita" (en mayúsculas) agenda y redirige a `/mi-cuenta/citas`.
- Foco de inputs en color **accent** (no primary).

- [ ] **Step 3: Confirmar estado de git**

Run: `git log --oneline feat/storefront-booking -7`
Expected: 6 commits (Tasks 1–6), sin archivos de `apps/admin`.

> No hay commit en esta tarea: solo verificación. La integración de la rama se decide al cerrar SP5b con el usuario.

---

## Notas de cierre

- SP5b cierra el roadmap completo (SP1–SP5). El flujo de reserva queda alineado con Stitch salvo avatares/imágenes reales (placeholder D4) y bio de especialista (no disponible en el endpoint).
- El calendario es propio del storefront (decisión B); no se acopló al calendario del admin.
