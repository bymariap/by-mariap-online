# Storefront Responsive Audit — Design

**Date:** 2026-07-22
**Status:** Approved (pending spec review)
**Scope:** Storefront only (`apps/storefront`). The admin panel (`apps/admin`) is a separate future cycle.

## Goal

Systematically audit all 13 storefront pages at three viewport widths, producing a consolidated report of responsive/usability defects ranked by severity. The deliverable is the **report**, not the fixes — fixes are a separate implementation cycle chosen from this report's findings.

## Non-goals (explicit)

- **No fixes in this cycle.** This is discovery only. The user reviews the report and decides which findings warrant a fix plan.
- **No admin audit.** Admin is a separate project (different codebase, different design system, near-zero existing responsive code). It gets its own cycle later.
- **No redesign.** We flag broken/awkward responsive behavior; we do not propose visual redesigns or new features.
- **No cross-browser matrix.** Audit runs in the in-app Chromium browser only. Safari/Firefox-specific quirks are out of scope.

## Audit target

Production: `https://bymariap.com`. This reflects what customers actually see today, including the live catalog and R2-served images.

## Why live visual QA (not code review)

A code-only review misses defects that look correct in source. Confirmed example: `apps/storefront/src/components/header.tsx:32` marks the entire nav `hidden md:flex` with **no hamburger fallback** — on mobile the navigation simply vanishes, leaving a visitor unable to reach Tienda/Servicios/Galería/etc. The code reads as intentional; only rendering it at 375px reveals the bug. Live QA at real breakpoints is the only reliable method for a customer-facing site.

## Breakpoints

Three widths, matching the browser tool's presets:

| Name | Size | Represents |
|------|------|------------|
| Mobile | 375 × 812 | Narrowest common real device (iPhone SE/mini) |
| Tablet | 768 × 1024 | iPad portrait |
| Desktop | 1280 × 800 | Standard laptop/desktop |

## Pages under audit (13)

1. `/` — Home
2. `/productos` — Product catalog
3. `/productos/[slug]` — Product detail
4. `/servicios` — Services catalog
5. `/servicios/[slug]` — Service detail (+ booking form)
6. `/carrito` — Cart
7. `/checkout` — Checkout
8. `/checkout/confirmacion` — Order confirmation
9. `/mi-cuenta` — Account
10. `/mi-cuenta/pedidos` — Orders
11. `/mi-cuenta/citas` — Appointments
12. `/login` — Login
13. `/politica-tratamiento-datos` — Data policy (legal)

### State-dependent pages

Several pages need real state to render meaningfully (not an empty or "unauthorized" screen). Before auditing these, establish the state:

- **Requires a logged-in session:** `/mi-cuenta`, `/mi-cuenta/pedidos`, `/mi-cuenta/citas`, and `/checkout` (may redirect or gate).
- **Requires items in the cart:** `/carrito`, `/checkout`, `/checkout/confirmacion`.

Log in and add a product to the cart first so these pages show the real customer state.

## Severity levels

Each finding is one of three levels:

**Blocker — breaks usage**
1. Horizontal scroll / lateral overflow
2. Content inaccessible on a narrower width with no alternative (e.g. the header nav)
3. Overlap — elements stacking over each other, hiding text/controls
4. Text clipped, truncated unintentionally, or illegibly small

**Usability — works but hurts**
5. Tap targets < ~44px, hard to hit with a thumb
6. Awkward forms — non-adapting fields, cramped inputs, controls out of thumb reach
7. Images mis-scaled — distorted, oddly cropped, or forcing a fixed width
8. Tables/grids that don't collapse — forcing horizontal scroll or cramming on mobile

**Polish — visible, not blocking**
9. Unbalanced spacing — margins/padding fine on desktop, cramped or empty on mobile
10. Visual hierarchy — heading/text sizes that don't re-scale well across breakpoints

## Method (per page × breakpoint)

For each of the 13 pages, at each of the 3 widths:

1. Resize the browser to the target width.
2. Navigate to the page (establishing session/cart state first where required).
3. Capture a screenshot and read the accessibility tree.
4. Evaluate against the 10-point checklist above.
5. Record each finding as: **page · breakpoint · severity · description · probable `file:line` for the fix**.

39 page×breakpoint combinations total (13 × 3).

## Deliverable

A report saved to `docs/superpowers/specs/2026-07-22-storefront-responsive-audit-report.md`:

- **Executive summary:** finding counts by severity; the most problematic pages.
- **Findings table:** one row per finding — page · breakpoint · severity · description · probable `file:line`. Sorted by severity (Blockers first).
- **Visual evidence:** key screenshots (especially Blockers) so the reader sees the defect, not just reads it.
- **Pattern notes:** recurring issues grouped (e.g. "no form constrains its width on desktop") so a single fix covers many instances rather than being logged ten times.

## What happens after

```
Visual audit (this cycle) → Report → User reviews & prioritizes → Fix plan (separate) → Implementation
```

The user reviews the report and decides which findings are worth fixing (some Polish items may be intentionally skipped). Only then does a separate implementation plan get written for the approved fixes.
