# Storefront Design — Cejas Medellín Studio (Stitch source)

Stitch project id: 5755618256776589056

## Screens (id → purpose)

All screens are Desktop @ 1280px (Stitch frames at 2560px 2× scale).

### Canonical screens (use these — updated for full Luminous consistency)
- `34949a9643f74665a330d122005f489e` : Home ("Home Page - Recuperación de Cejas", 1280×4684)
- `f564a8d98a7949ddaa6f7976a5eca151` : Catálogo ("Tienda - Consistencia Total Luminous", 1280×3020)
- `f28cfa5d9ced4dfea386f7b6574b7afa` : Detalle de producto ("Detalle Producto - Consistencia Total Luminous", 1280×5404 — supersedes old 146bf678)
- `9383eea67aa64a2ea994b2c093a92fcb` : Carrito activo ("Carrito de Compras - Activo", 1280×2240)
- `f379f75da488466d9f77cce11d4a40d0` : Carrito vacío ("Carrito de Compras - Vacío", 1280×2740)
- `10030cd14bc644fba36766ab57f2c941` : Checkout ("Checkout - Consistencia Total Luminous v2", 1280×1977 — supersedes old b37c1aca)
- `dbb85a703f6640cebfae9cbc6ba1184d` : Confirmación de pedido ("Confirmación de Pedido - Luminous", 1280×3598)
- `ff3cb95803e54ba19a8d6e402bc34400` : Procesando pago / pending state ("Procesando Pago - Luminous", 1280×2620)
- `69bf5dae2f3d4cef9b460729e52812d2` : Login ("Inicio de Sesión - Luminous Brow Atelier", 1280×2544)
- `c6f267c7ccfb42cba3ac67754db34f4f` : Mi perfil ("Mi Perfil - Consistencia Total Luminous", 1280×4104)
- `fd670ab2836b42ee85061f64481a48fe` : Dashboard / Mis pedidos ("Dashboard - Consistencia Total Luminous", 1280×3440)
- `88b24e4787f64be8a61f0394e299209c` : Dashboard sin pedidos / empty ("Dashboard - Sin Pedidos (Consistencia Luminous)", 1280×2598)

### Hidden / superseded (do not use for implementation)
- `adefeb3314654abd89b2b506f5748b43` : Tienda v1 consistencia (hidden)
- `9fa61fc2843c4552a1bf13455d5af848` : Tienda v0 (hidden)
- `146bf678c764447194a2c967419d308b` : Detalle producto v0 (hidden)
- `b37c1aca57304b1da8762205ec5b6955` : Checkout v0 (hidden)
- `80ae143b8d2b442cb66787c47784b1ef` : Carrito v0 generado (hidden)
- `37b5c34ac3c8426fb507f3159933d3ed` : Citas/Booking (out of scope — Phase 5)

### Out of scope screens (Phase 5+)
- `a80b201669444f6da2e8cea8c5938e31` : Citas - Consistencia Total Luminous (booking flow)

---

## Design system
Source: assets/0621d882d48643e7990b9c5c40cd7c6b (name: "Luminous Brow Atelier" — "The Editorial Muse")

### Colors (hex as found in namedColors)
- primary: #5f5e5e (warm charcoal)
- primary-foreground (on_primary): #faf7f6
- primary-dim: #535252
- background / surface: #fbf9f5 (warm off-white)
- foreground (on_surface): #30332e (warm near-black — use instead of pure black)
- on_surface_variant: #5d605a (muted text)
- muted / surface_container_low: #f5f4ef
- surface_container: #eeeee8
- surface_container_high: #e8e9e2
- surface_container_highest: #e2e3db
- surface_container_lowest: #ffffff (bright lift for cards)
- surface_dim: #d9dbd2
- border (outline_variant): #b1b3ab (use at 15% opacity per "Ghost Border" rule)
- outline: #797c75
- accent / secondary: #705b44 (warm brown — input focus bottom border)
- accent-foreground (on_secondary): #fff7f3
- accent-container (secondary_container): #fadec0 (soft callouts / serenity moments)
- tertiary: #5e605c
- tertiary_container: #f4f4ef
- destructive (error): #9e422c
- destructive-foreground (on_error): #fff7f6

### Override colors (applied on top of named tokens)
- overridePrimaryColor: #1A1A1A (near-black — stronger contrast for buttons/CTAs)
- overrideSecondaryColor: #A68E74 (lighter warm taupe)
- overrideTertiaryColor: #F5F5F0 (near-white warm)
- overrideNeutralColor: #FDFBF7
- customColor: #DCC7B1 (warm sand — bespoke accents)

### Typography
- heading family: Noto Serif (display + all headlines)
- body / label family: Manrope
- Display-LG (hero): 3.5rem / tight leading
- h1 / Headline-LG: ~2.25rem / tight leading
- h2 / Headline-MD: 1.75rem / tight leading
- h3 / Headline-SM: ~1.25rem / normal leading
- body / Body-MD: 0.875rem / 1.5 — set in on_surface_variant (#5d605a) to keep vibe soft
- small: 0.75rem / 1.4
- label: Manrope, 0.875rem, uppercase tracking

### Spacing & layout
- container max-width: 1280px (frames at 2560px = 2× scale)
- gutter: 24px (standardized; editorial asymmetry 10%/15% noted in design system but use 24px for code)
- default border radius: 8px (ROUND_EIGHT — rounded-lg)
- card radius: 4px (0.25rem — "sm" for product cards)
- button shape: pill (border-radius: 9999px — full rounded)
- button height (md): 48px
- spacing base: 4px (spacingScale: 3 → steps 4/8/12/16/24/32/48/64)

---

## Design rules (non-negotiable — from "The Editorial Muse")

1. **No 1px solid borders between sections.** Architecture via background color shifts only.
2. **No pure black (#000000).** Use on_surface (#30332e) or overridePrimary (#1A1A1A) for max contrast.
3. **No horizontal dividers between list items.** Use 48px–64px vertical whitespace.
4. **Primary buttons:** pill shape (9999px radius), gradient primary (#5f5e5e) → primary_dim (#535252). Override: #1A1A1A for high-contrast CTAs.
5. **Floating nav/header:** Glassmorphism — surface at 70% opacity + backdrop-filter: blur(20px).
6. **Input fields:** Ghost bottom border only (outline_variant at 15% opacity). Focus → secondary (#705b44) bottom border.
7. **Ambient shadow:** box-shadow: 0 20px 40px rgba(48, 51, 46, 0.05) for floating elements.
8. **White space:** after you think there is enough, add 20% more.
9. **Icons:** 1px stroke weight (lucide default — use strokeWidth={1} or strokeWidth={1.5}).
10. **Surface hierarchy:** background (#fbf9f5) → surface_container_low (#f5f4ef) → surface_container_lowest (#ffffff for bright-lift cards).
