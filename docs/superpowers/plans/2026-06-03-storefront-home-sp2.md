# SP2 — Home (storefront) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir el home (`page.tsx`) al layout de Stitch usando la fundación de SP1 (tokens, clases `t-*`, íconos Material Symbols), más el nav "Galería" en el Header.

**Architecture:** Un rewrite cohesivo de `apps/storefront/src/app/page.tsx` (5 secciones en orden Stitch) + un cambio mínimo en `header.tsx`. Migración incremental de los 4 íconos del home a Material Symbols SVGR `?react`. Secciones dependientes de backend/assets se maquetan con placeholders neutros (D3/D4) marcados `TODO(...)`.

**Tech Stack:** Next 15 (webpack), React 19, Tailwind 3.4, pnpm, `@material-symbols/svg-300` + SVGR (instalados en SP1).

**Spec:** [`docs/superpowers/specs/2026-06-03-storefront-home-sp2-design.md`](../specs/2026-06-03-storefront-home-sp2-design.md)

**Convenciones:**
- Comandos desde la raíz del monorepo `C:\Users\Theodoro\Documents\by-mariap-online`; paquete `@bymariap/storefront`.
- **Commits sin** trailer `Co-Authored-By`. **No** convertir line endings a CRLF.
- Hay WIP previo en `apps/admin/*` no relacionado: **no** incluirlo en ningún commit (nombrar archivos exactos en cada `git add`).
- **Desviación intencional vs spec (§F):** el CTA del services banner se implementa como `Link` estilizado con clases accent (no `Button` dentro de `Link`), para no anidar `<button>` en `<a>`. Mantiene el look marrón.

---

## Task 0: Rama de trabajo

**Files:** —

- [ ] **Step 1: Crear la rama desde main**

Run:
```bash
git checkout -b feat/storefront-home
```
Expected: `Switched to a new branch 'feat/storefront-home'`

---

## Task 1: Nav "Galería" en el Header

**Files:**
- Modify: `apps/storefront/src/components/header.tsx:5-11`

- [ ] **Step 1: Añadir el enlace "Galería"**

En `apps/storefront/src/components/header.tsx`, reemplazar el array `navLinks` por:

```tsx
const navLinks = [
  { label: "Inicio", href: "/" },
  { label: "Tienda", href: "/productos" },
  { label: "Servicios", href: "/servicios" },
  { label: "Galería", href: "/#galeria" },
  { label: "Nosotros", href: "/#nosotros" },
  { label: "Contacto", href: "/#contacto" },
];
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores (exit 0).

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/header.tsx
git commit -m "feat(storefront): add Galería nav link in header"
```

---

## Task 2: Rewrite del home (`page.tsx`)

**Files:**
- Modify: `apps/storefront/src/app/page.tsx` (reemplazo completo del archivo)

- [ ] **Step 1: Reemplazar todo el contenido de `page.tsx`**

Reemplazar **todo** `apps/storefront/src/app/page.tsx` por:

```tsx
import Link from "next/link";
import { serverFetch } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import { ProductCard } from "@/components/product-card";
import type { ProductDTO } from "@bymariap/types";
import LocalShipping from "@material-symbols/svg-300/outlined/local_shipping.svg?react";
import LocationOn from "@material-symbols/svg-300/outlined/location_on.svg?react";
import VerifiedUser from "@material-symbols/svg-300/outlined/verified_user.svg?react";
import CalendarToday from "@material-symbols/svg-300/outlined/calendar_today.svg?react";

export const revalidate = 60;

const trustItems = [
  {
    Icon: LocalShipping,
    circle: "bg-accent-container text-accent-container-foreground",
    title: "Envíos en Medellín y Colombia",
    body: "Logística premium para que tus productos lleguen en perfecto estado.",
  },
  {
    Icon: LocationOn,
    circle: "bg-muted text-foreground",
    title: "Ubicación en El Poblado",
    body: "Un santuario de belleza diseñado para tu relajación y transformación.",
  },
  {
    Icon: VerifiedUser,
    circle: "bg-surface-high text-foreground",
    title: "Productos Certificados",
    body: "Fórmulas dermatológicamente testeadas para la salud de tu piel y vello.",
  },
];

export default async function HomePage() {
  let products: ProductDTO[] = [];
  try {
    products = await serverFetch<ProductDTO[]>(endpoints.storeProducts, {
      next: { revalidate: 60 },
    });
  } catch {
    // API not running during build — render with empty list
  }

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        {/* TODO(asset): imagen de fondo del hero — reemplazar este div por <Image fill> */}
        <div className="absolute inset-0 bg-muted" aria-hidden />
        <div className="container relative z-10 max-w-xl px-8 md:px-16 space-y-6">
          <p className="t-eyebrow">Digital Atelier • Medellín</p>
          <h1 className="t-hero text-foreground">
            Recupera la belleza natural de tus cejas
          </h1>
          <p className="font-body text-base md:text-lg font-light text-muted-foreground max-w-md leading-relaxed">
            Productos premium y servicios expertos en el corazón de Medellín.
            Redescubre tu mirada con un enfoque minimalista y orgánico.
          </p>
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Ver Productos <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* ── TRUST INDICATORS ── */}
      <section className="bg-surface py-20">
        <div className="container grid grid-cols-1 md:grid-cols-3 gap-16">
          {trustItems.map(({ Icon, circle, title, body }) => (
            <div
              key={title}
              className="flex flex-col items-center text-center gap-4"
            >
              <span
                className={`w-16 h-16 rounded-full flex items-center justify-center ${circle}`}
              >
                <Icon className="h-7 w-7" />
              </span>
              <h3 className="font-heading text-xl text-foreground">{title}</h3>
              <p className="font-body text-sm font-light text-muted-foreground leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TRANSFORMACIONES (placeholder) ── */}
      <section id="galeria" className="bg-muted py-24">
        <div className="container space-y-10">
          <div className="flex items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="t-eyebrow">Transformaciones</p>
              <h2 className="t-display text-foreground">
                Nuestras transformaciones
              </h2>
            </div>
            <Link
              href="/#galeria"
              className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              Ver Galería Completa →
            </Link>
          </div>
          {/* TODO(backend): galería real de transformaciones (antes/después) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[4/5] bg-surface-high rounded-xl" />
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ── */}
      <section className="bg-background py-24">
        <div className="container space-y-10">
          <div className="space-y-2">
            <h2 className="t-display text-foreground">
              Esenciales para tus cejas
            </h2>
            <p className="font-body text-sm md:text-base font-light text-muted-foreground">
              Nuestra curaduría de productos diseñados para fortalecer y
              embellecer desde casa.
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <p className="font-body text-sm font-light text-muted-foreground">
              Los productos se cargarán cuando la tienda esté activa.
            </p>
          )}

          <div>
            <Link
              href="/productos"
              className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver todos los productos →
            </Link>
          </div>
        </div>
      </section>

      {/* ── SERVICES BANNER ── */}
      <section className="py-24 px-8">
        <div className="container relative rounded-xl overflow-hidden min-h-[500px] flex items-center p-12 md:p-24 bg-surface-high">
          {/* TODO(asset): imagen del estudio — reemplazar este div por <Image fill> */}
          <div className="absolute inset-0 bg-muted opacity-60" aria-hidden />
          <div className="relative z-10 max-w-xl space-y-6">
            <span className="t-eyebrow">Cuidado en Estudio</span>
            <h2 className="t-display text-foreground">
              Diseño y recuperación experta
            </h2>
            <p className="font-body text-lg font-light text-muted-foreground">
              Agenda una sesión personalizada donde evaluamos la salud de tus
              folículos y diseñamos un plan de recuperación a medida.
            </p>
            <Link
              href="/servicios"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-accent text-accent-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Agendar Cita <CalendarToday className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @bymariap/storefront typecheck`
Expected: sin errores (valida los imports `.svg?react` y los tipos).

- [ ] **Step 3: Verificar build**

Run: `pnpm --filter @bymariap/storefront build`
Expected: build exitoso (compila SVGR + clases `t-*`/tokens).

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/app/page.tsx
git commit -m "feat(storefront): rebuild home to Stitch layout (hero, trust, gallery, services banner)"
```

---

## Task 3: Verificación final (typecheck + lint + build + visual)

**Files:** —

- [ ] **Step 1: Typecheck, lint y build**

Run:
```bash
pnpm --filter @bymariap/storefront typecheck
pnpm --filter @bymariap/storefront lint
pnpm --filter @bymariap/storefront build
```
Expected: los tres en verde (exit 0).

- [ ] **Step 2: Revisión visual manual**

Run: `pnpm --filter @bymariap/storefront dev`

Abrir `http://localhost:3000/` y verificar:
- **Hero**: fondo full-bleed (placeholder gris `bg-muted`) ocupando el alto, con el texto a la **izquierda**; `h1` en serif **light** grande (`t-hero`); CTA "Ver Productos" en taupe.
- **Trust**: 3 ítems **centrados**, cada ícono dentro de un **círculo tonal** (peach / gris muted / surface-high); íconos Material Symbols (camión, pin, escudo) que heredan el color; headings serif `text-xl`.
- **Transformaciones**: sección visible "Nuestras transformaciones" con **3 cajas placeholder** (`aspect-[4/5]`, sin contenido falso).
- **Featured**: heading `Esenciales para tus cejas` en serif light; cards con título serif.
- **Services banner**: card `rounded-xl` con placeholder; contenido a la **izquierda**; CTA **marrón** "Agendar Cita" con ícono de calendario que **navega a `/servicios`**.
- **Header**: aparece "Galería" en el nav y ancla a la sección.
- Sin regresiones de layout evidentes.

- [ ] **Step 3: Confirmar estado de git**

Run: `git log --oneline feat/storefront-home -3`
Expected: 2 commits (Task 1 y Task 2), sin archivos de `apps/admin`.

> No hay commit en esta tarea: solo verificación. La integración de la rama se decide al cerrar SP2 con el usuario.

---

## Notas de cierre

- Al terminar SP2, el home queda alineado con Stitch salvo imágenes reales (hero, services) y la galería real de transformaciones — ambas dependen de assets/backend y están maquetadas con placeholders `TODO(...)`.
- Quedan 3 íconos lucide en el resto del codebase (carrito `Trash2`/`ShieldCheck`, etc.), que migran en sus páginas (SP3–SP5).
- Posible ajuste futuro (no SP2): cuando entre la imagen del hero, añadir un scrim para contraste del texto.
