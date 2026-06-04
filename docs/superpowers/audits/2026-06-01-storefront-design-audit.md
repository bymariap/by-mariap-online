# Auditoría de diseño del storefront vs. Stitch "Cejas Medellín Studio"

- **Fecha:** 2026-06-01
- **Alcance:** Solo diagnóstico. No se modificó código de la app.
- **Fuente de diseño:** proyecto Stitch `5755618256776589056` ("Cejas Medellín Studio"), 13 screens DESKTOP (2560px).
- **Código auditado:** `apps/storefront` (Next.js App Router + Tailwind).
- **Método:** Se descargó el HTML de referencia de cada screen de Stitch (clases Tailwind + `tailwind.config` embebido) y se comparó token a token contra el código real del storefront (`tailwind.config.ts`, `src/app/index.css` y cada page/componente). El análisis es a nivel de clases/tokens exactos, no de pixel-screenshot.

> **Nota de naming:** El header de Stitch usa la marca placeholder "Muse Studio"; el storefront usa "By MariaP" / "Cejas Medellín Studio". Se asume que la marca del storefront es la correcta y NO se reporta como discrepancia.

---

## 0. Mapeo screen de Stitch → página del storefront

| Screen de Stitch | Página storefront | Archivo |
|---|---|---|
| Home Page - Recuperación de Cejas | `/` | `src/app/page.tsx` |
| Tienda - Consistencia Total Luminous | `/productos` | `src/app/productos/page.tsx` |
| Detalle Producto - Consistencia Total Luminous | `/productos/[slug]` | `src/app/productos/[slug]/page.tsx` |
| Carrito de Compras - Activo | `/carrito` (con items) | `src/app/carrito/page.tsx` |
| Carrito de Compras - Vacío | `/carrito` (vacío) | `src/app/carrito/page.tsx` |
| Checkout - Consistencia Total Luminous v2 | `/checkout` | `src/app/checkout/page.tsx` |
| Procesando Pago - Luminous | `/checkout/confirmacion` (pending) | `src/app/checkout/confirmacion/page.tsx` |
| Confirmación de Pedido - Luminous | `/checkout/confirmacion` (paid) | `src/app/checkout/confirmacion/page.tsx` |
| Inicio de Sesión - Luminous Brow Atelier | `/login` | `src/app/login/page.tsx` |
| Mi Perfil - Consistencia Total Luminous | `/mi-cuenta` | `src/app/mi-cuenta/page.tsx` |
| Dashboard - Consistencia Total Luminous | `/mi-cuenta/pedidos` (con pedidos) | `src/app/mi-cuenta/pedidos/page.tsx` |
| Dashboard - Sin Pedidos | `/mi-cuenta/pedidos` (vacío) | `src/app/mi-cuenta/pedidos/page.tsx` |
| Citas - Consistencia Total Luminous | flujo `/servicios` + `/servicios/[slug]` | `src/app/servicios/*` |

Todas las screens del proyecto Stitch tienen contraparte en el storefront. **No hay screens "inventadas" ni faltantes en el mapeo.**

---

## 1. Hallazgos globales (sistema de diseño / tokens)

El storefront colapsó el set de tokens Material 3 de Stitch en un set reducido en `src/app/index.css`. La mayoría de tokens base **coinciden** (bien hecho), pero hay desviaciones sistémicas que afectan a todas las páginas.

### 1.1 Tokens que SÍ coinciden (referencia)

| Rol | Stitch | Storefront (`index.css`) | Estado |
|---|---|---|---|
| background / surface | `#fbf9f5` | `--background: #fbf9f5` | ✅ |
| on-surface / texto | `#30332e` | `--foreground: #30332e` | ✅ |
| surface-container | `#eeeee8` | `--surface: #eeeee8` | ✅ |
| surface-container-low | `#f5f4ef` | `--muted: #f5f4ef` | ✅ |
| surface-container-lowest | `#ffffff` | `--surface-lowest: #ffffff` | ✅ |
| on-surface-variant | `#5d605a` | `--muted-foreground: #5d605a` | ✅ |
| outline-variant | `#b1b3ab` | `--border: #b1b3ab` | ✅ |
| error | `#9e422c` | `--destructive: #9e422c` | ✅ |
| Fuente headings | Noto Serif | `--font-heading: "Noto Serif"` | ✅ |
| Fuente body | Manrope | `--font-body: "Manrope"` | ✅ |

### 1.2 Discrepancias globales

| # | Severidad | Qué dice Stitch | Qué hay hoy | Archivo:línea | Recomendación |
|---|---|---|---|---|---|
| G1 | **Alta** | Peso tipográfico de los headings display es **light / normal** (`font-light`, `font-normal`) sobre serif grande con `tracking-tight` — estética editorial y aireada. Aparece en hero, carrito (`font-light`), checkout (`font-normal`), confirmación (`font-light`), perfil, dashboard. | Todos los headings usan `font-semibold` (600), sin `tracking-tight`. Resulta más pesado/compacto que el diseño. | `src/app/index.css:37-44` (base) + cada `h1/h2` de las pages | Definir clase/escala de heading con peso `font-normal`/`font-light` y `tracking-tight` para los display (≥text-3xl). Reservar semibold solo para sub-títulos pequeños. |
| G2 | **Alta** | El set de color incluye `secondary-container: #fadec0` (durazno cálido) usado como **acento de marca** (badges, highlights, status) en las 13 screens. | El token peach NO existe en `index.css`. Solo aparece **hardcodeado inline** una vez (`background: "#fadec0"`) en el carrito. | `src/app/index.css:6-19` (falta) · uso suelto en `src/app/carrito/page.tsx:166` | Añadir tokens `--secondary-container: #fadec0` y `--on-secondary-container` y exponerlos en `tailwind.config.ts`. Reemplazar el hex inline por el token. |
| G3 | **Media** | `primary: #5f5e5e` (gris/taupe medio). Los CTA `bg-primary` se ven taupe, no negros. | `--primary: #1a1a1a` (casi negro). Botones primarios mucho más oscuros/contrastados que el diseño. | `src/app/index.css:11` | Decidir intención de marca. Si se quiere fidelidad con Stitch, subir `--primary` hacia `#5f5e5e` (o un taupe oscuro intermedio). Documentar la decisión. |
| G4 | **Media** | `secondary: #705b44` (marrón) se usa como **CTA alterno y color de texto de acento** (p.ej. nombres de ingredientes `text-secondary`, hover de links del carrito). | `--accent: #705b44` existe pero solo se usa para focus-ring de inputs/botones; nunca como CTA ni como texto de acento. | `src/app/index.css:14` + componentes | Usar `accent`/secondary como segundo CTA y para textos de acento donde Stitch lo aplica (detalle de producto, links de carrito). |
| G5 | **Media** | Escala de radios: `DEFAULT 4px`, `lg 8px`, **`xl 12px`**, `full`. Cards "editorial" usan `rounded-xl` (12px). | `--radius-md` y `--radius-lg` están ambos en `8px`; no existe el escalón de 12px. Las cards se renderizan a 8px. | `src/app/index.css:21-24` + `tailwind.config.ts:33-38` | Añadir `--radius-xl: 12px` y usarlo en las cards con sombra editorial (login, resumen, service-card, etc.). |
| G6 | **Media** | Las píldoras de estado de pedido son **suaves/tonales**: `Pagado` → `bg-surface-container-high text-primary`; `Enviado` → `bg-secondary-container/50 text-secondary`. Baja emfasis, diferenciadas por color. | `OrderStatusPill` usa **relleno sólido oscuro** `bg-primary text-primary-foreground` idéntico para `paid/preparing/shipped/delivered` (sin diferenciación de color). | `src/components/order-status-pill.tsx:5-10` | Rediseñar las píldoras como tonales (fondo `*-container`, texto de color), diferenciando estados (peach=enviado, etc.) como en Stitch. |
| G7 | **Baja** | Pesos de fuente cargados: Manrope **300**;400;500;600 (usa 300 para texto fino). Noto Serif 400;700 + itálica 400. | `layout.tsx` carga Manrope 400-700 (sin 300) y Noto Serif 400-700. Falta el peso 300 que el diseño usa, y la itálica de Noto Serif. | `src/app/layout.tsx:7-19` | Añadir Manrope `300` y la itálica de Noto Serif (`style: ["normal","italic"]`) para soportar los headings light e itálicos. |
| G8 | **Baja** | Sub-títulos de sección en cursiva serif (`italic`) como firma visual: "¿Cómo usar?", "Información Personal", "Cuidado Esencial", fechas del dashboard. | El storefront no usa `italic` en ningún heading. | varias pages | Aplicar `italic` a los sub-títulos de sección serif donde Stitch lo hace. |
| G9 | **Baja** | Iconografía: Material Symbols Outlined. | `lucide-react`. | global | Aceptable (ambas son line-icons). Solo unificar grosor (`strokeWidth`) para consistencia. No bloqueante. |

---

## 2. Tabla resumen por página

| Página | Coincidencia global | Discrepancias clave | Severidad máx. |
|---|---|---|---|
| `/` Home | Media | Hero sin imagen (centrado vs. hero imagen full-height 921px); falta sección "Nuestras transformaciones"; nav sin "Galería"; nombres de producto sans en vez de serif | **Alta** |
| `/productos` Tienda | Media-Alta | Solo 1 filtro (faltan "Objetivo" y "Precio"); grid 3-up vs 4-up; nombres de producto sans vs serif; sin botón "add" en hover de card | **Media** |
| `/productos/[slug]` Detalle | Baja | Faltan secciones completas: Cómo usar, Ingredientes, Reseñas/Resultados, "Completa tu rutina", FAQ. H1 semibold vs serif light | **Alta** |
| `/carrito` Activo | Alta | Heading semibold vs `font-light` text-4xl/5xl; "Resumen" text-lg vs text-2xl; peach inline | **Media** |
| `/carrito` Vacío | Media | Stitch muestra 3 categorías destacadas con headings itálicos; storefront muestra estado vacío simple | **Media** |
| `/checkout` | Media | Sin sección "Método de Pago" (va directo a Wompi); H1/H2 más chicos y semibold; pasos con círculo numerado (no en Stitch) | **Media** |
| `/checkout/confirmacion` | Alta | H1 semibold vs `font-light` text-5xl; resto bastante alineado | **Media** |
| `/login` | Media | Card `max-w-sm rounded-md p-8` vs `max-w-md rounded-xl p-12`; H1 text-2xl vs text-4xl | **Media** |
| `/mi-cuenta` Perfil | Media | H1 text-2xl vs text-4xl "Mi Perfil"; secciones sin itálica; layout sidebar similar | **Media** |
| `/mi-cuenta/pedidos` | Media | Píldoras de estado sólidas vs tonales (ver G6); headings más chicos | **Media** |
| `/servicios` + `/[slug]` (Citas) | Baja | Stitch es flujo de 1 página con hero "Reserve Your Artistry", cards de servicio, sección "Tu Especialista" y calendario mensual; storefront lo parte en grid + form con selector de fecha nativo | **Media** |

---

## 3. Detalle por página

Formato de cada fila: **Severidad** · Stitch dice → Hoy hay · `archivo:línea` · Recomendación.

### 3.1 Home (`/` → `src/app/page.tsx`)

| Sev | Stitch dice | Hoy hay | Archivo:línea | Recomendación |
|---|---|---|---|---|
| **Alta** | Hero full-bleed con **imagen** y altura `min-h-[921px]`, texto alineado a la izquierda (`flex items-center px-8 md:px-16`). | Hero **sin imagen**, banda centrada `py-32 text-center max-w-3xl`. El titular y subtítulo coinciden literalmente, pero el layout es otro. | `page.tsx:23-42` | Implementar hero con imagen de fondo/lateral, altura grande y texto a la izquierda. Mantener copy actual. |
| **Alta** | Sección **"Nuestras transformaciones"** (galería de cards con overlay hover y botón). | No existe ninguna galería de transformaciones. | `page.tsx` (ausente) | Añadir sección de galería/antes-después entre trust y productos. |
| **Media** | Nombres de producto en serif `text-lg` (`font-headline`). | `ProductCard` usa `text-sm font-body` (sans, chico). | `src/components/product-card.tsx:28-30` | Cambiar título de card a serif (`font-heading`) y subir a `text-base/text-lg`. |
| **Media** | Trust cards con heading serif `text-xl`. | Trust cards con `text-base font-semibold`. | `page.tsx:66-68` | Subir headings de trust a serif `text-xl`. |
| **Media** | Headings de sección serif `text-4xl md:text-5xl`. | `text-3xl font-semibold`. | `page.tsx:81,116` | Subir a `text-4xl/5xl` y peso light (ver G1). |
| **Baja** | Nav incluye "Galería" y "Citas". | Nav: Inicio, Tienda, Servicios, Nosotros, Contacto (sin "Galería"; usa "Servicios" en vez de "Citas"). | `src/components/header.tsx:5-11` | Añadir "Galería" si se implementa la sección; alinear naming Citas/Servicios. |

### 3.2 Tienda (`/productos` → `src/app/productos/page.tsx`)

| Sev | Stitch dice | Hoy hay | Archivo:línea | Recomendación |
|---|---|---|---|---|
| **Media** | Sidebar de filtros con **3 grupos**: "Categorías", "Objetivo", "Precio" (headings serif `text-lg`). | Solo filtro "Categorías" (`text-xs uppercase`). | `productos/page.tsx:49-53` · `src/components/category-filter.tsx:23-25` | Añadir filtros "Objetivo" y "Precio"; usar headings de filtro serif `text-lg`. |
| **Media** | Grid de productos **4-up** (`lg:grid-cols-4`), `gap-y-12`. | Grid **3-up** (`lg:grid-cols-3 gap-6`). | `productos/page.tsx:68` | Cambiar a `lg:grid-cols-4` y aumentar `gap-y`. |
| **Media** | Cards con botón "add" que aparece en hover (`absolute bottom-4 … bg-primary`). | `ProductCard` no tiene acción en hover (solo zoom de imagen). | `src/components/product-card.tsx:9-26` | Añadir botón flotante de "Añadir" en hover. |
| **Baja** | Título de catálogo serif `text-2xl` ("Colección de Cuidado"). | `text-3xl font-semibold` con mismo texto. | `productos/page.tsx:58-60` | Ajustar peso a light. |

### 3.3 Detalle de producto (`/productos/[slug]`)

| Sev | Stitch dice | Hoy hay | Archivo:línea | Recomendación |
|---|---|---|---|---|
| **Alta** | Página rica multi-sección: H1 serif `text-4xl/5xl` + **"¿Cómo usar?"** (3 pasos), **"Ingredientes Clave"** (con `text-secondary`), **"Experiencias/Resultados Reales"** (reseñas), **"Completa tu rutina"** (productos relacionados), **"Preguntas Frecuentes"**. | Solo galería 2-col + buy-box (badges, título, precio, descripción, stock, add-to-cart). Falta todo el contenido editorial. | `productos/[slug]/page.tsx:53-168` | Priorizar según datos disponibles: añadir "Cómo usar", "Ingredientes" y "Completa tu rutina"/relacionados. Reseñas/FAQ requieren datos de backend (marcar como dependiente). |
| **Media** | H1 serif **light** `text-4xl md:text-5xl tracking-tight`. | `text-3xl md:text-4xl font-semibold`. | `productos/[slug]/page.tsx:139-141` | Subir tamaño, peso light y `tracking-tight`. |
| **Baja** | Sub-secciones con borde/cursiva (`italic border-l-4 border-secondary-container pl-6`). | N/A. | — | Aplicar al añadir las secciones (usa el token peach G2). |

### 3.4 Carrito (`/carrito`)

| Sev | Stitch dice | Hoy hay | Archivo:línea | Recomendación |
|---|---|---|---|---|
| **Media** | H1 `font-light text-4xl md:text-5xl tracking-tight mb-16`. | `text-3xl font-semibold mb-8`. | `carrito/page.tsx:51-53` | Subir tamaño/peso light y margen inferior. |
| **Media** | "Resumen" serif `text-2xl font-light`. | `text-lg font-semibold`. | `carrito/page.tsx:120-122` | Subir a `text-2xl` light. |
| **Media** (Vacío) | El estado vacío de Stitch muestra 3 categorías destacadas con headings itálicos ("Cuidado Esencial", "Herramientas Pro", "Novedades") + CTA `px-12 py-4`. | Estado vacío minimal: título + párrafo + 1 botón `h-12 px-8`. | `carrito/page.tsx:30-47` | Enriquecer estado vacío con sugerencias de categorías; CTA con más padding. |
| **Baja** | Acento peach vía token. | `background: "#fadec0"` hardcodeado. | `carrito/page.tsx:166` | Reemplazar por token (G2). |

### 3.5 Checkout (`/checkout`)

| Sev | Stitch dice | Hoy hay | Archivo:línea | Recomendación |
|---|---|---|---|---|
| **Media** | Stitch tiene 3 secciones: Identificación y Entrega, **Método de Envío** y **Método de Pago** (con campos de tarjeta), headings serif `text-2xl`. | 2 secciones (Identificación, Envío) con círculos numerados; el pago se delega a Wompi (sin sección de pago). | `checkout/page.tsx:136-266` | Decisión de producto: si el pago es 100% Wompi redirect, documentar la divergencia intencional. Subir headings a `text-2xl`. |
| **Media** | H1 `text-4xl font-normal tracking-tight`. | `text-3xl font-semibold`. | `checkout/page.tsx:126-128` | Alinear tamaño/peso (G1). |
| **Baja** | Headings de sección sin círculo numerado. | Usa círculos numerados `bg-primary` (1,2). | `checkout/page.tsx:138-143,226-231` | Opcional: quitar círculos para fidelidad, o mantener como mejora de UX (documentar). |
| **Baja** | CTA `py-5 rounded-full uppercase tracking-widest`. | `h-12 rounded-full` sin uppercase/tracking. | `checkout/page.tsx:268-275` | Considerar uppercase + tracking en el CTA de pago. |

### 3.6 Confirmación / Procesando (`/checkout/confirmacion`)

| Sev | Stitch dice | Hoy hay | Archivo:línea | Recomendación |
|---|---|---|---|---|
| **Media** | H1 `font-headline font-light text-4xl md:text-5xl` ("¡Gracias por…", "Procesando tu pago…"). | `text-3xl font-semibold`. | `checkout/confirmacion/page.tsx:72-78` | Subir tamaño y peso light. |
| **Baja** | Layout y secciones (Resumen + Dirección) coinciden bien. | Igual estructura 2-col con cards de sombra. | `confirmacion/page.tsx:96-153` | Sin cambios estructurales. |
| **Baja** | Stitch "Procesando" tiene tratamiento visual propio (spinner/estado). | Storefront reutiliza la misma vista con icono `Clock`. | `confirmacion/page.tsx:61-66` | Aceptable; opcional añadir animación de carga. |

### 3.7 Login (`/login`)

| Sev | Stitch dice | Hoy hay | Archivo:línea | Recomendación |
|---|---|---|---|---|
| **Media** | Card `max-w-md`, `rounded-xl`, `p-8 md:p-12`, `hover:shadow-xl`. H1 `font-display text-4xl tracking-tight`. | Card `max-w-sm`, `rounded-md`, `p-8`. H1 `text-2xl font-semibold`. | `login/page.tsx:41-52` | Ensanchar a `max-w-md`, radio xl, padding `md:p-12`, H1 `text-4xl` light. |
| **Baja** | CTA `py-4 uppercase tracking-…`. | `h-12` sin uppercase. | `login/page.tsx:83-89` | Alinear estilo del CTA. |

### 3.8 Mi Perfil (`/mi-cuenta`)

| Sev | Stitch dice | Hoy hay | Archivo:línea | Recomendación |
|---|---|---|---|---|
| **Media** | H1 serif `text-4xl tracking-tight` "**Mi Perfil**"; sub-secciones `text-xl text-primary italic` ("Información Personal", "Dirección de Envío", "Seguridad"). | H1 `text-2xl font-semibold` con texto "Información Personal" (usa el sub-título como H1; no hay "Mi Perfil"). Sin itálica, sin secciones Dirección/Seguridad. | `mi-cuenta/page.tsx:13-21` | Añadir H1 "Mi Perfil" `text-4xl`; convertir bloques en sub-secciones itálicas; añadir Dirección/Seguridad si hay datos. |
| **Baja** | Avatar/foto de perfil. | Avatar con iniciales en círculo `bg-muted`. | `mi-cuenta/layout.tsx:51-60` | Aceptable como fallback. |

### 3.9 Mis Pedidos (`/mi-cuenta/pedidos`)

| Sev | Stitch dice | Hoy hay | Archivo:línea | Recomendación |
|---|---|---|---|---|
| **Media** | Píldoras de estado **tonales** diferenciadas (peach/surface). H1 `text-4xl` "Mis pedidos"; fechas como headings serif itálicos. | Píldoras sólidas `bg-primary` iguales para todos los estados activos. H1 `text-2xl`. | `src/components/order-status-pill.tsx:5-10` · `pedidos/page.tsx:50-52` | Rediseñar píldoras (G6); subir H1; usar fechas itálicas. |
| **Media** (Sin pedidos) | Estado vacío con H1 `text-3xl md:text-4xl` + CTA `px-10 py-4`. | H1 `text-2xl` + CTA `h-12 px-8`. | `pedidos/page.tsx:31-44` | Alinear tamaños. |

### 3.10 Citas / Servicios (`/servicios`, `/servicios/[slug]`)

| Sev | Stitch dice | Hoy hay | Archivo:línea | Recomendación |
|---|---|---|---|---|
| **Media** | Flujo de **una sola página**: hero "Reserve Your Artistry" `text-5xl/6xl`, "Selecciona un Servicio" (cards `text-xl`), "Tu Especialista" (bio), "Agenda tu Cita" con **calendario mensual** (`grid-cols-7`) + slots `grid-cols-3`, "Confirmación de Reserva". | Dos páginas: `/servicios` (H1 "Servicios" `text-4xl` + grid de cards) y `/servicios/[slug]` (info + `BookingForm`). El picker de fecha es un `<input type="date">` nativo, no calendario mensual. | `servicios/page.tsx:18-31` · `servicios/[slug]/page.tsx` · `src/components/date-slot-picker.tsx:38-44` | Acercar a la narrativa de Stitch: hero más fuerte, sección "Tu Especialista", y reemplazar el input nativo por un calendario mensual visual. La división en 2 páginas puede mantenerse (documentar). |
| **Media** | Hero de citas con título grande + subtítulo editorial. | `/servicios` arranca con H1 plano "Servicios" + una línea. | `servicios/page.tsx:19-22` | Añadir hero/encabezado con jerarquía. |
| **Baja** | Cards de servicio con heading `text-xl`. | `ServiceCard` heading `text-lg font-semibold`. | `src/components/service-card.tsx:10` | Subir a `text-xl`, peso light. |

---

## 4. Componentes compartidos (resumen)

| Componente | Discrepancia | Archivo:línea | Sev |
|---|---|---|---|
| `Button` | Variant `default` usa `bg-primary` (#1a1a1a) → más oscuro que Stitch (#5f5e5e). Sin variante secondary/peach. CTAs de Stitch usan `uppercase tracking-widest py-4/5`; el Button usa `h-12/h-14` sin uppercase. | `src/components/ui/button.tsx:7-18` | Media |
| `ProductCard` | Título sans `text-sm` vs serif `text-lg`; sin add-en-hover. | `src/components/product-card.tsx:28-33` | Media |
| `OrderStatusPill` | Relleno sólido vs píldoras tonales diferenciadas. | `src/components/order-status-pill.tsx:5-10` | Media |
| `Badge` | `bg-muted` gris; Stitch usa badges peach (`secondary-container`) en varios sitios. | `src/components/ui/badge.tsx:9` | Baja |
| `Input` | Underline-only (`border-b`) con focus `accent`. Stitch mezcla inputs con caja (`rounded-md border`) en booking/checkout. Inconsistencia interna: `BookingForm` usa inputs con caja propios en vez del `Input` compartido. | `src/components/ui/input.tsx:11-14` · `booking-form.tsx:100-119` | Baja |
| `AppointmentStatusPill` | Ya es tonal (`bg-primary/10`, etc.) — **alineado** con la lógica de Stitch (a diferencia de `OrderStatusPill`). | `src/components/appointment-status-pill.tsx:4-9` | ✅ |

> **Inconsistencia interna detectada:** `BookingForm` y `DateSlotPicker` definen inputs con estilo de caja (`rounded-md border focus:ring-primary`) en lugar de reutilizar `<Input>` (underline + focus accent). Además usan `focus:ring-primary` mientras el resto del sistema usa `focus:ring-accent`. Unificar.

---

## 5. Top-10 priorizado de arreglos

1. **(G1 / Alta)** Corregir el **peso tipográfico de los headings display**: pasar de `font-semibold` a `font-light`/`font-normal` + `tracking-tight` en todos los `h1/h2` ≥ text-3xl (hero, carrito, checkout, confirmación, perfil, pedidos). Es la desviación más visible y transversal. *(define el "look" editorial Luminous)*
2. **(Home / Alta)** Rediseñar el **hero de la home** como hero con imagen full-height (`min-h` grande, texto a la izquierda) en lugar de la banda centrada sin imagen.
3. **(G2 / Alta)** Añadir el **token peach `secondary-container: #fadec0`** (+ `on-secondary-container`) a `index.css`/`tailwind.config.ts` y reemplazar el hex inline del carrito; es el acento de marca usado en las 13 screens.
4. **(Detalle / Alta)** Construir las **secciones editoriales del detalle de producto** (Cómo usar, Ingredientes, Completa tu rutina); reseñas/FAQ quedan sujetas a datos de backend.
5. **(G6 / Media)** Rediseñar **`OrderStatusPill`** como píldoras **tonales diferenciadas** (peach/surface) en vez de relleno sólido `bg-primary`.
6. **(Tienda / Media)** Tienda: grid **4-up**, añadir filtros **"Objetivo" y "Precio"**, y botón **add-en-hover** en las cards.
7. **(ProductCard / Media)** Nombres de producto en **serif `text-lg`** (no sans `text-sm`) en home, tienda y relacionados.
8. **(G3+G4 / Media)** Resolver la **identidad de color de CTA**: alinear `--primary` con el taupe de Stitch (#5f5e5e) o documentar el negro como decisión de marca; y usar `accent/secondary` (#705b44) como segundo CTA / texto de acento.
9. **(Login + Perfil / Media)** Login: card `max-w-md rounded-xl p-12`, H1 `text-4xl`. Perfil: añadir H1 "Mi Perfil" `text-4xl` y sub-secciones itálicas (Información, Dirección, Seguridad).
10. **(Citas / Media)** Reemplazar el `<input type="date">` por un **calendario mensual visual** y reforzar el encabezado/hero de servicios + sección "Tu Especialista". Unificar inputs del `BookingForm` con `<Input>` y `focus:ring-accent`.

---

## Apéndice — Notas de método y limitaciones

- La comparación se basó en el **HTML de referencia de Stitch** (clases Tailwind exactas + `tailwind.config` embebido), que es la fuente más precisa para tokens. No se renderizó el storefront en vivo; las discrepancias de **estados hover/carga/error** se infirieron del código (que sí los implementa: loading, vacío, error de envío, toasts).
- Stitch usa `darkMode: "class"` (tiene variantes dark). El storefront **no implementa dark mode**. No se reporta como discrepancia porque no se indicó soporte dark como requisito; anotarlo como decisión pendiente.
- Algunas divergencias (checkout sin paso de pago propio por usar Wompi redirect; booking partido en 2 páginas) parecen **decisiones de producto intencionales** y se marcaron como "documentar", no como bug de diseño.
