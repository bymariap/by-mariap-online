# Admin Panel Responsive Audit — Design

**Date:** 2026-07-24
**Status:** Approved
**Scope:** Admin only (`apps/admin`). Reuses the methodology validated in `2026-07-22-storefront-responsive-audit-design.md`.

## Goal

Audit all 10 admin screens at three viewport widths, producing a consolidated report of responsive/usability defects ranked by severity. As with the storefront cycle, the deliverable is the **report**, not fixes — fixes are a separate implementation cycle chosen from this report's findings.

## Non-goals

- No fixes in this cycle (discovery only).
- No redesign — flag broken/awkward behavior, don't propose new features.
- No cross-browser matrix (Chromium via Playwright only).

## Context different from the storefront cycle

- **Everything except `/login` is normally auth-gated** (`ProtectedRoute`). Auth has been temporarily disabled in production by the project owner to allow this audit to run unauthenticated; it must be re-enabled after the audit completes.
- **Known structural finding going in:** `AppShell` (`apps/admin/src/components/app-shell.tsx`) renders `<div className="min-h-screen grid grid-cols-[220px_1fr]">` — a fixed 220px sidebar column with **zero responsive breakpoints**, applied to every authenticated page via the shared layout. Unlike the storefront header (hidden but togglable), there is no fallback at all. This is audited and confirmed like any other finding, not assumed.

## Breakpoints

Same three as the storefront audit:

| Name | Size |
|------|------|
| Mobile | 375 × 812 |
| Tablet | 768 × 1024 |
| Desktop | 1280 × 800 |

## Pages under audit (10)

1. `/login`
2. `/products` — product list
3. `/products/new` — product form (create), includes the `<ImageUpload>` component
4. `/categories` — list + category dialog
5. `/users` — list + user dialog
6. `/specialists` — list + specialist dialog (includes `<ImageUpload>` avatar)
7. `/services` — list + service dialog
8. `/mi-agenda` — availability, includes the availability-window dialog
9. `/citas` — appointments list

(9 distinct screens + login = 10 audited surfaces. `/products/:id` reuses the same form component as `/products/new` — not counted separately.)

## Severity levels

Identical to the storefront audit — see `2026-07-22-storefront-responsive-audit-design.md` for the full 10-point checklist (Blocker / Usability / Polish).

## Method

Same as storefront: live visual QA via Playwright (accurate viewport emulation), DOM overflow measurement (`scrollWidth` vs `clientWidth`) at each breakpoint, screenshots for visual confirmation, dialogs opened and checked in their open state (not just the trigger page).

## Audit target

Production: `https://admin.bymariap.com` (auth temporarily disabled).

## Deliverable

`docs/superpowers/specs/2026-07-24-admin-responsive-audit-report.md`, same structure as the storefront report: executive summary, findings table, visual evidence, pattern notes.

## What happens after

Same flow as storefront: report → user reviews/prioritizes → separate fix plan → implementation. Additionally: **re-enable admin authentication in production** once the audit is done, regardless of what happens with fixes.
