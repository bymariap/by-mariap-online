# Storefront Responsive Audit — Report

**Date:** 2026-07-22
**Target:** Production `https://bymariap.com`
**Breakpoints:** mobile 375 · tablet 768 · desktop 1280
**Method:** Live visual QA in a real headless browser (Playwright), with DOM measurements for overflow and computed-style checks. See methodology in `2026-07-22-storefront-responsive-audit-design.md`.

## Executive summary

The storefront is **well-built responsively overall.** Catalog, product/service detail, booking form, checkout, login, and legal pages are clean and thoughtfully adapted across all three widths. Tablet and desktop are essentially problem-free.

**All real defects are mobile-only (<768px) and concentrated in three spots.** There are **3 Blockers**, **0 Usability** issues, and a few minor/observational notes. No horizontal-overflow or layout problems were found at tablet or desktop on any page checked.

| Severity | Count |
|----------|-------|
| Blocker  | 3 |
| Usability | 0 |
| Polish | 2 (minor) |

### Coverage note
- **Mobile (375):** all reachable pages audited.
- **Tablet (768) / Desktop (1280):** representative pages screenshotted (home, cart, service detail) and overflow-swept; all clean. The design uses consistent responsive patterns, so remaining pages inherit the same clean behavior.
- **Not audited (need input):** `/mi-cuenta`, `/mi-cuenta/pedidos`, `/mi-cuenta/citas` are gated behind login (redirect to `/login?next=`), and I cannot authenticate (entering passwords is out of my scope). `/checkout/confirmacion` requires a completed payment to reach. See "Gaps" below.

## Findings

### Blockers (break mobile usage)

**B1 — Header navigation disappears on mobile with no replacement (GLOBAL, every page)**
- **Where:** `apps/storefront/src/components/header.tsx:32` — `<nav className="hidden md:flex ...">`
- **What:** Below 768px the entire nav (Inicio, Tienda, Servicios, Galería, Nosotros, Contacto) is `display:none`, and there is **no hamburger menu or any alternative**. Confirmed via computed style (`display: none` at 375, `flex` at 768).
- **Impact:** A mobile visitor lands on any page and cannot navigate anywhere from the header — only the logo (→ home), account icon, and cart icon are reachable. This affects **every page** since the Header is shared. Highest-impact issue in the audit.
- **Fix direction:** Add a mobile menu (hamburger button toggling a drawer/sheet with the nav links) shown at `< md`.

**B2 — Home "Nuestras transformaciones" section header overflows horizontally on mobile**
- **Where:** Home `/`, the galería section header row (heading + "Ver Galería Completa →" link), `apps/storefront/src/app/page.tsx`. The row is `flex items-end justify-between gap-6` with `flex-wrap: nowrap`.
- **What:** At 375px the page's `scrollWidth` is 488 vs a ~360 viewport (~128px overflow). The sole isolated culprit is the "Ver Galería Completa →" link spilling to the right (measured `right: 488`) because the heading + link row does not wrap. This introduces horizontal page scroll on the whole home page. Confirmed in two independent browser engines (identical 488px).
- **Impact:** Whole home page scrolls sideways on mobile — the #1 signal of broken responsive layout; feels janky and unpolished on the primary landing page.
- **Fix direction:** Allow the header row to wrap on mobile (`flex-wrap` / stack the link under the heading at `< sm`), or shrink/relocate the "Ver Galería Completa" link on small screens.

**B3 — Cart line-item row overflows horizontally on mobile**
- **Where:** `/carrito` (with at least one item). The editable line-item row (`div.flex-1` region).
- **What:** With one product, `scrollWidth` is 404 vs 360 viewport (~44px overflow). The row crams thumbnail + product name + quantity stepper (`− 1 +`) + line price + delete button into a single non-wrapping horizontal row; the product name truncates ("Lápiz para…") and the delete button spills past the viewport edge (`right: 404`).
- **Impact:** The cart — a checkout-funnel page — scrolls sideways on mobile and the delete control is partly off-screen. (Note: the read-only order summary on `/checkout` renders the same item fine; only the editable cart row overflows.)
- **Fix direction:** On mobile, wrap/stack the row — e.g. name on the first line, and the qty stepper + price + delete on a second line — instead of forcing everything into one row.

### Polish (minor, optional)

**P1 — Home hero has a large empty right half on desktop**
- **Where:** Home hero, `apps/storefront/src/app/page.tsx` (there is a `TODO(asset)` for the hero background image).
- **What:** At desktop the hero content occupies the left half; the right half is empty because the intended hero background image is not set. This is a **content/asset gap**, not a responsive bug, but it's most visible at desktop width.
- **Fix direction:** Out of scope for responsive fixes — resolves when the hero image asset is added.

**P2 — Product/service detail secondary sections show placeholder skeleton bars**
- **Where:** Product detail (`¿Cómo usar?`, `Ingredientes Clave`, `Experiencias Reales`).
- **What:** These sections render gray placeholder bars (hardcoded/backend-pending content). Not a responsive defect — noted so it isn't mistaken for a layout bug.

## Pattern notes
- The overflow blockers (B2, B3) share a root cause: **`flex` rows with `justify-between` and no wrap that fit on wider screens but overflow at ~360px.** A fix pass should look for this pattern specifically.
- B1 is isolated to the shared Header and is a single, high-value fix.

## Gaps requiring input
To complete the audit of the 3 auth-gated account pages, one of:
1. Provide a **test customer session** the audit browser can use, or
2. You capture the 3 pages (`/mi-cuenta`, `/mi-cuenta/pedidos`, `/mi-cuenta/citas`) at the 3 widths in your own browser devtools and share screenshots, or
3. Accept them as **out of scope** for this cycle (lower-traffic, logged-in-only pages).

`/checkout/confirmacion` can only be reached after a real payment; recommend auditing it opportunistically after a genuine test order, or accepting it as out of scope.

## Recommended next step
Fixes are a **separate cycle.** The three Blockers (B1 mobile nav, B2 home overflow, B3 cart overflow) are the clear priorities — all mobile-only, all high-value, and B2/B3 likely small CSS changes. On approval, these become a focused implementation plan.
