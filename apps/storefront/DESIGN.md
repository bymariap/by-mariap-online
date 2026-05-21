# Storefront Design — Cejas Medellín Studio (Stitch source)

Stitch project id: 5755618256776589056

## Screens (id → purpose)

Screens found in the Stitch project:

- 34949a9643f74665a330d122005f489e: Home ("Home Page - Recuperación de Cejas", 2560×9370px)
- 9fa61fc2843c4552a1bf13455d5af848: Catálogo v1 ("Tienda - Recuperación de Cejas", 2560×3002px, hidden)
- adefeb3314654abd89b2b506f5748b43: Catálogo v2 / canonical ("Tienda - Consistencia de Diseño", 2560×3020px)
- 146bf678c764447194a2c967419d308b: Detalle de producto ("Detalle de Producto - Serum Recuperador", 2560×5382px)
- b37c1aca57304b1da8762205ec5b6955: Checkout ("Checkout - Muse Studio", 2560×3670px)
- 37b5c34ac3c8426fb507f3159933d3ed: Citas / Booking Flow ("Citas - Muse Studio Booking Flow", 2560×6742px)
- 448427d8a8ee41af95fba27a24e28483: Citas variant / hidden ("Citas - Muse Studio Booking Flow", 1280×1024px, hidden)
- ae20b34d02c1448398d8fb1030b5984d: Home mobile variant ("Home Page - Recuperación de Cejas", 1280×1024px, hidden)

### MISSING SCREENS (blocking)
The following required screens do not exist as distinct screens in this Stitch project:
- Carrito (shopping cart review)
- Confirmación de orden (order confirmation / success)
- Login / Iniciar sesión
- Mi cuenta / pedidos

These must be designed and added to the Stitch project, or the plan must be updated to specify which existing screen covers each flow before implementation begins.

## Design system
Source: assets/0621d882d48643e7990b9c5c40cd7c6b (name: "Luminous Brow Atelier")

### Colors (hex as found)
- primary: #5f5e5e (warm charcoal — button backgrounds, high-contrast text)
- primary-foreground: #faf7f6 (on_primary — text on primary surfaces)
- background: #fbf9f5 (surface/base canvas — warm off-white)
- foreground: #30332e (on_surface / on_background — near-black warm)
- muted / surface: #f5f4ef (surface_container_low — inset content blocks)
- surface-container: #eeeee8
- surface-container-high: #e8e9e2
- surface-container-highest: #e2e3db
- surface-container-lowest: #ffffff (bright lift for cards / booking modules)
- border: #b1b3ab (outline_variant — used at 15% opacity per design system rules)
- outline: #797c75
- accent: #705b44 (secondary — warm brown, input focus states)
- accent-foreground: #fff7f3 (on_secondary)
- accent-container: #fadec0 (secondary_container — soft callout / serenity moments)
- destructive: #9e422c (error)
- destructive-foreground: #fff7f6 (on_error)
- surface-dim: #d9dbd2
- surface-variant: #e2e3db (tertiary_container)

### Typography
- heading family: Noto Serif (display and all headlines)
- body family: Manrope (body, labels, functional e-commerce text)
- display-lg (hero): 3.5rem / tight leading
- h1 (headline-lg): ~2.25rem / tight leading
- h2 (headline-md): 1.75rem / tight leading
- h3 (headline-sm): ~1.25rem / normal leading
- body: 0.875rem / 1.5 (Body-MD — set in on_surface_variant)
- small: 0.75rem / 1.4
- label: Manrope, 0.875rem uppercase tracking

### Spacing & layout
- container max-width: 1280px (design frames are 2560px wide at 2× scale)
- gutter: asymmetric per design system — ~10% left, ~15% right for editorial feel; standardize to 24px for implementation
- default border radius: 8px (roundness: ROUND_EIGHT)
- card radius: 4px (0.25rem — "sm" for product cards per design system spec)
- button height (md): 48px (pill shape — border-radius: 9999px)
- spacing scale: 3 (Stitch spacingScale=3, base unit ~4px → spacing steps 4/8/12/16/24/32/48/64)

## Notes

### Design philosophy — key constraints for implementation
- NO 1px solid borders between sections. Use background color shifts (surface → surface_container_low).
- NO pure black (#000000). Use on_surface (#30332e) for maximum contrast.
- NO horizontal dividers between list items. Use 48px or 64px vertical whitespace.
- Primary buttons: pill shape (border-radius: 9999px), gradient from primary (#5f5e5e) to primary_dim (#535252).
- Nav / header (floating): Glassmorphism — surface color at 70% opacity + backdrop-filter: blur(20px).
- Ambient shadow for FABs: box-shadow: 0 20px 40px rgba(48, 51, 46, 0.05).
- Input fields: ghost border only (outline_variant at 15% opacity). Focus → secondary (#705b44) bottom border.
- White space rule: after you think there is enough, add 20% more.

### Screens to be created before Phase 4 implementation
The following screens need to be added to Stitch project 5755618256776589056:
1. Carrito — shopping cart with line items, quantity controls, subtotal, proceed-to-checkout CTA
2. Confirmación de orden — post-payment success with order number, summary, next steps
3. Login / Registro — email + password form, social login option, register link
4. Mi cuenta / Pedidos — account dashboard, order history list, order detail view

### Stitch design system asset id
assets/0621d882d48643e7990b9c5c40cd7c6b — referenced in project screenInstances as a DESIGN_SYSTEM_INSTANCE (960×540px swatch sheet).

### Override colors (Stitch UI overrides applied on top of named colors)
- overridePrimaryColor: #1A1A1A (near-black, stronger than primary #5f5e5e)
- overrideSecondaryColor: #A68E74 (lighter warm taupe)
- overrideTertiaryColor: #F5F5F0 (near-white warm)
- overrideNeutralColor: #FDFBF7 (slightly warmer than background)
- customColor: #DCC7B1 (warm sand — used for bespoke accents)
