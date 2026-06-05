# Inventario de TODOs — Storefront placeholders

- **Fecha:** 2026-06-05
- **Fase:** Investigación (sin cambios de código)
- **Contexto:** Auditoría de marcadores `TODO(backend)` y `TODO(asset)` en `apps/storefront/src` tras la alineación de diseño SP1–SP5. Cada placeholder fue dejado intencionalmente durante la fase de diseño (decisiones D3/D4 de [triage](./2026-06-01-storefront-design-decisions.md)).
- **Referencia:** [Auditoría de diseño](./2026-06-01-storefront-design-audit.md) · Specs SP2–SP5a en `docs/superpowers/specs/`

---

## 1. Inventario completo

| ID | Marcador | Archivo : línea | Tipo | Sección / UI | Qué falta en el sistema | Esfuerzo est. | Dependencias |
|----|----------|-----------------|------|--------------|-------------------------|---------------|--------------|
| T-B1 | `TODO(backend): galería real de transformaciones (antes/después)` | `app/page.tsx:107` | BACKEND | Home — sección "Nuestras transformaciones" (3 cajas placeholder aspect-[4/5]) | Nuevo modelo `Transformation` (before/afterImageUrl, caption?, publishedAt); migración Prisma; endpoint público `GET /store/transformations`; CRUD admin; DTO | M | ninguna |
| T-B2 | `TODO(backend): dirección guardada del usuario` | `app/mi-cuenta/page.tsx:40` | BACKEND | Mi cuenta — sub-sección "Dirección de Envío" (3 skeleton bars) | Campo `shippingAddress Json?` en modelo `User` (o modelo `UserAddress` separado); migración; endpoint `GET /me/address` + `PUT /me/address`; DTO + validación | S–M | ninguna |
| T-B3 | `TODO(backend): cambio de contraseña` | `app/mi-cuenta/page.tsx:51` | BACKEND | Mi cuenta — sub-sección "Seguridad" (botón deshabilitado) | Endpoint `POST /me/change-password`; DTO `{ currentPassword, newPassword }`; verificación bcrypt + hash nuevo; `UpdateMeDto` no lo incluye hoy | S | ninguna |
| T-B4 | `TODO(backend): filtro por objetivo (no existe el atributo en el modelo)` | `components/catalog-filters-placeholder.tsx:6` | BACKEND | Catálogo — sidebar filtro "Objetivo" (3 checkboxes inertes: Crecimiento/Definición/Hidratación) | Nuevo campo enum `objetivo` en modelo `Product`; migración; parámetro `objetivo?` en `ListProductsQuery`; filtrado en `ProductsService.findPublic()`; exposición en `ProductDTO`; admin UI para asignarlo | M | T-B5 (misma PR de filtros) |
| T-B5 | `TODO(backend): filtro por precio (el filtrado debe hacerse en backend)` | `components/catalog-filters-placeholder.tsx:22` | BACKEND | Catálogo — sidebar filtro "Precio" (range slider inerte $0–$500.000) | Parámetros `minPriceCop?` e `maxPriceCop?` en `ListProductsQuery`; cláusula `WHERE priceCop >= … AND priceCop <= …` en `findPublic()`; sin migración (campo ya existe) | XS–S | ninguna (solo afecta lógica de query) |
| T-B6 | `TODO(backend): pasos de uso del producto` | `components/product-detail-placeholders.tsx:8` | BACKEND | Detalle producto — sección "¿Cómo usar?" (3 skeleton cards) | Campo JSON `usageSteps Json?` en `Product` (array de `{ stepNumber, title, body }`) o modelo `ProductUsageStep`; migración; exponer en `ProductDTO`; admin UI para editar | M | T-B7, T-B9 (misma ampliación del modelo Product) |
| T-B7 | `TODO(backend): ingredientes clave` | `components/product-detail-placeholders.tsx:25` | BACKEND | Detalle producto — sección "Ingredientes Clave" (2 skeleton cards) | Campo JSON `ingredients Json?` en `Product` (array de `{ name, description }`) o modelo `ProductIngredient`; misma migración que T-B6 | M | T-B6 |
| T-B8 | `TODO(backend): reseñas / experiencias reales` | `components/product-detail-placeholders.tsx:39` | BACKEND | Detalle producto — sección "Experiencias Reales" (2 skeleton review cards) | Nuevo modelo `ProductReview { id, productId, customerId?, reviewerName, rating, body, status(pending/approved), createdAt }`; migración; endpoint público `GET /store/products/:slug/reviews` (solo aprobadas); moderación admin; DTO | L | ninguna (pero deseable esperar a T-B6/T-B7 para misma iteración de producto) |
| T-B9 | `TODO(backend): preguntas frecuentes` | `components/product-detail-placeholders.tsx:68` | BACKEND | Detalle producto — sección "Preguntas Frecuentes" (4 skeleton rows) | Campo JSON `faqs Json?` en `Product` (array de `{ question, answer, sortOrder }`) o modelo `ProductFaq`; misma migración que T-B6 | S | T-B6 |
| T-A1 | `TODO(asset): imagen de fondo del hero` | `app/page.tsx:48` | ASSET | Home — Hero (div placeholder `absolute inset-0 bg-muted`) | Imagen del hero (fotografia del estudio/modelo) con proporción aprox. 16:9 tall; reemplazar div por `<Image fill objectFit="cover">`; añadir scrim (gradiente) para contraste sobre la imagen | XS (frontend) | Imagen disponible como URL |
| T-A2 | `TODO(asset): imagen del estudio` | `app/page.tsx:155` | ASSET | Home — Services banner (div placeholder `absolute inset-0 bg-muted opacity-60`) | Imagen del estudio/atelier; misma mecánica que T-A1 | XS (frontend) | Imagen disponible como URL |
| T-A3 | `TODO(asset): imagen de categoría` | `components/empty-cart-suggestions.tsx:25` | ASSET | Carrito vacío — sugerencias por categoría (div placeholder `aspect-[4/5] bg-muted`) | Campo `imageUrl String?` en modelo `Category` + migración + exponer en `CategoryDTO`; admin UI para asignarlo; frontend: `<Image>` cuando existe, mantener placeholder si es null | S (backend: campo + migración + DTO + admin) | Pipeline de assets (ver §3) |
| T-A4 | `TODO(asset): foto del especialista (placeholder cuando avatarUrl es null)` | `components/specialist-card.tsx:17` | ASSET | Home — sección especialistas / cualquier `SpecialistCard` (avatar vacío cuando avatarUrl=null) | Solo frontend: mostrar iniciales del nombre o ícono SVG genérico cuando `avatarUrl` es null (el campo `Specialist.avatarUrl` y el endpoint `GET /store/specialists` ya existen y exponen el campo) | XS (frontend) | El campo ya existe; pipeline de upload para cuando admin suba fotos reales |

---

## 2. Análisis de brechas — Backend

### 2.1 Lo que ya existe en `apps/api`

| Recurso | Qué hay | Relevancia para los TODOs |
|---------|---------|---------------------------|
| `Product` (Prisma) | `name, slug, description, priceCop, stockQuantity, imageUrls[], status, categories` | Faltan `objetivo`, `usageSteps`, `ingredients`, `faqs` |
| `GET /store/products` | Filtra por `categorySlug`, `search`, `status` | Faltan filtros `minPriceCop`, `maxPriceCop`, `objetivo` |
| `User` (Prisma) | `email, passwordHash, fullName, phone` | Falta `shippingAddress` |
| `PATCH /me` (`UpdateMeDto`) | Acepta `fullName`, `phone` | Falta endpoint de cambio de contraseña |
| `Specialist` (Prisma) | `avatarUrl String?` ya existe | T-A4 es solo frontend |
| `GET /store/specialists` | Expone `{ id, userId, user.fullName, specialties, avatarUrl }` | Ya listo; solo falta fallback en frontend |
| `Category` (Prisma) | `name, slug` | Falta `imageUrl` |

### 2.2 Lo que falta (agrupado por sub-proyecto natural)

**Sub-proyecto α — Filtros de catálogo** (T-B4 + T-B5)
- `ListProductsQuery`: añadir `minPriceCop?`, `maxPriceCop?`, `objetivo?`
- `Product`: añadir campo `objetivo` (enum o `String?`)
- Migración Prisma + `findPublic()` actualizado
- Exposición en `ProductDTO` + admin form

**Sub-proyecto β — Enriquecimiento del detalle de producto** (T-B6 + T-B7 + T-B9)
- `Product`: añadir `usageSteps Json?`, `ingredients Json?`, `faqs Json?` (o modelos relacionados — ver decisión §4)
- Migración + `ProductDTO` + admin editor (rich text o JSON)

**Sub-proyecto γ — Reseñas** (T-B8)
- Nuevo modelo `ProductReview` + moderación + endpoints (scope propio; más complejo)

**Sub-proyecto δ — Perfil del usuario** (T-B2 + T-B3)
- `User`: campo `shippingAddress Json?` + migración
- Endpoint `GET /me/address` + `PUT /me/address`
- Endpoint `POST /me/change-password`

**Sub-proyecto ε — Galería de transformaciones** (T-B1)
- Nuevo modelo `Transformation` + endpoint + admin CRUD (scope propio)

---

## 3. Análisis de brechas — Assets y pipeline de subida

### 3.1 Estado actual
No existe pipeline de subida de imágenes. En el modelo actual, `Product.imageUrls` y `Specialist.avatarUrl` son **URLs de texto** que el administrador ingresa manualmente (por ejemplo, copiando una URL de Cloudinary, un CDN externo, o cualquier hosting de imágenes). No hay endpoint de upload en `apps/api` ni en `apps/admin`.

### 3.2 Impacto por TODO de asset

| TODO | ¿Requiere pipeline nuevo? | Alternativa sin pipeline |
|------|---------------------------|--------------------------|
| T-A1 (hero) | No — imagen estática del proyecto o URL fija en `next.config.ts` | Añadir imagen al repo (`/public/hero.jpg`) o usar URL externa ya subida |
| T-A2 (services banner) | No — igual que T-A1 | Igual |
| T-A3 (imagen de categoría) | Sí si se quiere admin self-service; No si se acepta URL manual | Agregar `imageUrl` al modelo + admin ingresa URL a mano |
| T-A4 (avatar especialista fallback) | No — es solo frontend | Mostrar iniciales/SVG cuando `avatarUrl` es null |

### 3.3 Recomendación
Para el MVP, **no es necesario construir un pipeline de upload**. El patrón de URL manual que ya usan `imageUrls[]` y `avatarUrl` es suficiente. El pipeline (integración con un servicio de almacenamiento tipo Cloudinary o S3 + upload desde el admin) se puede diferir como mejora de DX para admin.

---

## 4. Decisiones abiertas (a resolver en Fase 2 / brainstorming)

| # | Pregunta | Opciones | Impacto |
|---|----------|----------|---------|
| Q1 | ¿`usageSteps`/`ingredients`/`faqs` como JSON en `Product` o como tablas relacionadas? | JSON: más simple, menos flexible. Tablas: reordenable, indexable, pero más migración. | Afecta T-B6, T-B7, T-B9 |
| Q2 | ¿`objetivo` como enum Prisma o `String?` libre? | Enum: type-safe, los filtros son exactos. String libre: más flexible pero necesita UI de selección de opciones fijas. | Afecta T-B4 |
| Q3 | ¿Reseñas (T-B8) en el mismo sub-proyecto que T-B6/T-B7/T-B9 o como sub-proyecto independiente? | Junto: una sola iteración de producto. Separado: reseñas tienen moderación (complejidad adicional). | Afecta planificación |
| Q4 | ¿`shippingAddress` como JSON plano en `User` o modelo `UserAddress` separado (con soporte multi-dirección futuro)? | JSON: MVP suficiente. Modelo separado: más flexible para múltiples addresses. | Afecta T-B2 |
| Q5 | ¿T-A1/T-A2 (hero/banner) como archivos en `/public` o como URLs configurables en admin? | `/public`: más simple. Admin configurable: flexible para cambios sin deploy. | Desacoplamiento deploy vs. contenido |

---

## 5. Propuesta de descomposición en sub-proyectos (borrador para Fase 2)

Orden sugerido por valor/desbloqueador:

| Orden | Sub-proyecto | TODOs | Esfuerzo total est. |
|-------|-------------|-------|---------------------|
| 1 | **Filtros de catálogo** — `objetivo` + precio | T-B4, T-B5 | S–M (1 día) |
| 2 | **Enriquecimiento de producto** — uso, ingredientes, FAQ | T-B6, T-B7, T-B9 | M (1–2 días) |
| 3 | **Assets estáticos** — hero, banner, avatar fallback | T-A1, T-A2, T-A4 | XS–S (horas; depende de que existan las imágenes) |
| 4 | **Categorías con imagen** | T-A3 | S (campo + migración + admin + frontend) |
| 5 | **Perfil de usuario** — dirección + contraseña | T-B2, T-B3 | S–M (1 día) |
| 6 | **Galería de transformaciones** | T-B1 | M–L (nuevo modelo + admin + frontend) |
| 7 | **Reseñas de producto** | T-B8 | L (nuevo sistema con moderación) |

> Este orden es un borrador. La descomposición final y la priorización se acuerdan en el brainstorming de Fase 2.
