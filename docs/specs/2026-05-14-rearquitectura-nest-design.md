# Rearquitectura: migración de MedusaJS V2 a NestJS

**Fecha:** 2026-05-14
**Autor:** Theodoro Dikuyama
**Estado:** Diseño aprobado — pendiente plan de implementación

## 1. Contexto y motivación

El proyecto actual (`bymariap-online`) usa MedusaJS V2 como backend. Tras 1-2 meses de desarrollo, el dev (solo, full-stack senior, con dominio fuerte en Express/React y menor dominio en Next/Medusa) identifica:

- Curva de aprendizaje alta de Medusa para features que no son ecommerce puro.
- Patrones poco intuitivos para auth + roles (separación `auth_identity` / `customer` / `user`).
- Módulos custom (`appointment`, `client-record`, `analytics`) forzados dentro del DSL de Medusa sin beneficio real.
- Riesgo de obsolescencia / breaking changes (V1 → V2 ya rompió mucho).
- Operación solo: cualquier framework con magia oculta multiplica el costo de mantenimiento.

Tras evaluación, la lista de features ecommerce realmente necesarias en MVP es corta (sin variantes, sin cupones, sin impuestos discriminados, sin devoluciones formales, sin DIAN, sin bloqueo de stock). El valor que Medusa aporta se redujo al punto que reescribir es más barato que mantener el híbrido o seguir luchando con la curva.

**Decisión:** rearquitectura completa a NestJS como Greenfield en un **repositorio nuevo**. El repo actual queda archivado como referencia visual/de UX para el nuevo admin.

## 2. Stack técnico

| Capa | Tecnología | Razón |
|---|---|---|
| Backend | **NestJS** | Estructura impuesta, módulos como unidad, DI, guards, encaja con varios dominios. Dev tiene dominio razonable. |
| ORM | **Prisma** | Schema declarativo, migraciones limpias, DX excelente, dev ya tiene experiencia. |
| DB | **PostgreSQL** | Estándar, integra con Railway. |
| Admin frontend | **Vite + React + React Router** | Panel interno detrás de login, sin SEO. Dev tiene dominio fuerte en React puro. |
| Storefront | **Next.js 15 (App Router)** | Requiere SEO para páginas de producto. SSR/ISR pagan bien aquí. |
| Data fetching | **TanStack Query** | Estándar en ambos frontends. |
| UI | **Tailwind + shadcn/ui** | Continuidad con stack actual. |
| Auth | **JWT en cookie httpOnly** | Sin proveedor externo (control de datos por Habeas Data). |
| Pagos | **Wompi** | PSE, tarjeta, Nequi, Bancolombia. No negociable (mercado colombiano). |
| Hosting backend | **Railway** | api + Postgres. |
| Hosting frontends | **Vercel** | admin + storefront. |
| Monorepo | **Turborepo** | Continuidad. |

## 3. Estructura del monorepo (nuevo repo)

```
nuevo-repo/
├── apps/
│   ├── api/                      ← NestJS
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── rbac/
│   │   │   │   ├── products/
│   │   │   │   ├── cart/
│   │   │   │   ├── orders/
│   │   │   │   ├── payments/
│   │   │   │   ├── shipping/
│   │   │   │   ├── services/
│   │   │   │   ├── availability/
│   │   │   │   ├── appointments/
│   │   │   │   ├── client-record/
│   │   │   │   ├── notifications/
│   │   │   │   └── analytics/
│   │   │   ├── common/           ← guards, filters, decorators
│   │   │   └── main.ts
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts
│   ├── admin/                    ← Vite + React
│   │   └── src/
│   │       ├── pages/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── lib/
│   └── storefront/               ← Next.js 15
│       └── app/
└── packages/
    ├── types/                    ← DTOs / contratos compartidos
    ├── ui/                       ← shadcn components
    └── config/                   ← eslint, tsconfig, tailwind
```

## 4. Módulos del backend

Cada módulo es una carpeta `src/modules/<nombre>` con `controller.ts`, `service.ts`, `dto/`, `tests/`. Dependencias entre módulos vía DI estándar de Nest. Las rutas se definen en cada controller con file-based naming (no file-based routing — Nest usa decoradores `@Controller`, `@Get`, etc., mapeados explícitamente).

### 4.1 `auth`
- Login: `POST /auth/login` con email + password. Devuelve JWT en cookie `httpOnly+SameSite=Lax+Secure`.
- Refresh: `POST /auth/refresh` con refresh token. TTL del access token: 1h. Refresh token: 7 días.
- Logout: `POST /auth/logout` limpia cookies.
- Guards: `JwtAuthGuard` extrae `user` del token; `PermissionsGuard` valida `@RequirePermissions('x:y')`.
- Hash de password: bcrypt cost 12.

### 4.2 `users`
- Modelo único `User { id, email, password_hash, role_id, full_name, phone, created_at }`.
- Subrecurso `Specialist { id, user_id (1-1), bio, specialties[], avatar_url }` — solo se crea si `role.name === 'specialist'`.
- Endpoints admin: CRUD de usuarios, asignación de rol.
- Endpoint self: `GET /me`, `PATCH /me`.

### 4.3 `rbac`
- Tablas: `Role`, `Permission`, `RolePermission`.
- Formato de permiso: `recurso:accion[:scope]` (ej. `appointments:read:own`, `products:write`, `invoices:read`).
- Permisos resueltos por rol al login, embebidos en el JWT.
- UI admin para gestionar roles y permisos (crear rol, asignar permisos al rol).
- Scoping (`:own`) **se aplica manualmente en cada service** — no se delega a librería. Patrón: si user tiene permiso con scope `own`, el service filtra por `user.specialistId` o `user.id` según el recurso.

### 4.4 `products`
- Modelo `Product { id, name, slug, description, price_cop, stock_quantity, image_urls[], category_ids[], status }`.
- Sin variantes (decisión MVP).
- Inventario simple: campo `stock_quantity` en el producto. Se descuenta al confirmar pago (webhook Wompi), no al agregar al carrito.
- Modelo `Category { id, name, slug }` con relación N-N a `Product`.
- Estados de producto: `draft`, `published`, `archived`.

### 4.5 `cart`
- Modelo `Cart { id, customer_id?, guest_token?, items[], created_at, updated_at }`.
- Asociado a `customer_id` si el user está logueado, o a una cookie `guest_token` si es invitado.
- Al login, si existe cart de invitado, se mergea con el del customer.
- Items: `CartItem { id, cart_id, product_id, quantity, unit_price_snapshot }`.
- Endpoints: `GET /store/cart`, `POST /store/cart/items`, `PATCH /store/cart/items/:id`, `DELETE /store/cart/items/:id`.

### 4.6 `orders`
- Modelo `Order { id, customer_id?, guest_email?, guest_phone?, items[], subtotal, shipping_cost, total, status, shipping_address, shipping_method, payment_id?, created_at, updated_at }`.
- Compra como invitado permitida: si no hay `customer_id`, exige `guest_email` + `guest_phone` (validados en DTO).
- `OrderItem { id, order_id, product_id, name_snapshot, quantity, unit_price_snapshot }`.
- Máquina de estados: `pending → paid → preparing → shipped → delivered` (o `cancelled` desde cualquier estado previo a `shipped`).
- Transiciones se hacen vía métodos de service explícitos (`markAsPaid()`, `markAsShipped()`, etc.), no por update directo del campo.

### 4.7 `payments`
- Integración Wompi: PSE, tarjeta crédito/débito, Nequi, Bancolombia.
- Endpoint `POST /store/payments/intent` crea intent en Wompi y devuelve datos para el widget del storefront.
- Webhook `POST /webhooks/wompi`:
  - Valida firma del header `X-Event-Signature` con secret.
  - Si evento es `transaction.updated` con status `APPROVED` → marca `Order` como `paid` y dispara descuento de stock.
  - Si status `DECLINED` o `VOIDED` → marca `Order` como `cancelled`.
  - Reintentos: log persistente de webhook recibido (tabla `webhook_log`) para idempotencia.

### 4.8 `shipping`
- Modelo `ShippingZone { id, name, cities[], price_cop }`.
- MVP: una zona "Medellín área metropolitana" con precio fijo + opción "recogida en tienda" precio 0.
- Endpoint `GET /store/shipping/options?city=X` devuelve métodos disponibles.

### 4.9 `services`
- Modelo `Service { id, name, slug, description, duration_minutes, price_cop, status }`.
- MVP arranca con 1 servicio (diseño de cejas, 45 min). Modelo soporta crecer a 2-3 sin cambios.

### 4.10 `availability`
- Modelo `SpecialistAvailability { id, specialist_id, date, start_time, end_time }` — calendario flexible publicado por especialista (no horario semanal fijo).
- Endpoint `GET /store/availability?service_id=X&date=YYYY-MM-DD&specialist_id=Y` genera slots de 30 min dentro de los rangos de disponibilidad publicados, **excluyendo** slots ya tomados por citas existentes.
- Lógica de slots fijos: empieza a las :00 y :30. Si servicio dura 45 min, el slot 10:00 ocupa hasta 10:45 → el siguiente slot disponible es 11:00 (no 10:45).
- Pruebas de integración cubren edge cases: día sin disponibilidad, slot a caballo, especialista de vacaciones, cita que pisa el almuerzo.

### 4.11 `appointments`
- Modelo `Appointment { id, customer_id, specialist_id, service_id, scheduled_at, duration_minutes, status, notes, created_at }`.
- Estados: `scheduled`, `completed`, `cancelled`, `no_show`.
- Cancelación libre hasta **24h antes** de `scheduled_at`. Después: requiere aprobación admin.
- Endpoint storefront `POST /store/appointments` permite invitados (email + teléfono obligatorios si no hay login).
- Pago en sitio en MVP (no se cobra al agendar).

### 4.12 `client-record`
- Modelo `ClientRecord { id, customer_id (1-1), allergies_encrypted, conditions_encrypted, notes_encrypted, photos_encrypted_urls[], created_at, updated_at }`.
- Encriptación: AES-256-GCM en campos sensibles. Llave en variable de entorno (`CLIENT_RECORD_ENCRYPTION_KEY`, Railway secret).
- Solo accesible por `admin` y por el `specialist` asignado a citas del cliente (scoping `:own_assigned`).
- Tabla `data_access_log { id, accessor_user_id, accessed_record_id, accessed_at, action }` — log de auditoría obligatorio por Habeas Data. Valores de `action`: `read`, `update`, `delete`, `export`.

### 4.13 `notifications`
- MVP: endpoint `GET /admin/notifications/whatsapp-reminders?date=tomorrow` devuelve lista de `{ customer_name, phone, appointment_at, wa_me_link }`.
- `wa_me_link` formato `https://wa.me/57XXXXXXXXXX?text=<mensaje_url_encoded>`.
- Admin UI muestra cards con botón "Enviar" que abre el link → admin envía manualmente desde su WhatsApp Business app.
- **Fase 3 (post-MVP):** switch a Meta Cloud API. La interfaz pública del módulo (`sendReminder(appointmentId)`) no cambia — solo la implementación interna pasa de generar link a llamar API.
- Cron job diario a las 8am hora Colombia (COT, UTC-5) que genera la lista del día siguiente y la deja lista para el admin. Implementado con `@nestjs/schedule`, timezone configurable por env var.

### 4.14 `analytics`
- Dashboards básicos: ventas por día (últimos 30 días), citas por día, top 10 productos, top 5 servicios.
- Implementación: queries SQL directas vía Prisma raw queries. Sin warehouse ni ETL.
- Endpoint `GET /admin/analytics/dashboard` devuelve los agregados.

## 5. Autenticación y autorización

### Modelo
- **Un solo modelo `User`** con `role_id`. Roles iniciales: `admin`, `finance`, `specialist`, `customer`.
- **Login uniforme** para todos los roles. El frontend (admin vs storefront) decide qué hacer con el user según rol.

### Flujo
1. `POST /auth/login` con `{ email, password }`.
2. Backend valida, resuelve permisos del rol, firma JWT con `{ sub, email, role, permissions[], specialistId? }`.
3. Set cookies `access_token` (httpOnly, SameSite=Lax, Secure en prod, TTL 1h) y `refresh_token` (httpOnly, SameSite=Lax, Secure en prod, TTL 7 días). El refresh token también se guarda hasheado en DB (tabla `RefreshToken { id, user_id, token_hash, expires_at, revoked_at? }`) para poder invalidarlo en logout.
4. `JwtAuthGuard` global con bypass por decorator `@Public()` en endpoints abiertos.

### Permisos (formato `recurso:accion[:scope]`)

| Rol | Permisos |
|---|---|
| `admin` | `*` (wildcard, todos) |
| `finance` | `orders:read`, `orders:write:status`, `invoices:read`, `analytics:read`, `customers:read` |
| `specialist` | `appointments:read:own`, `appointments:write:own`, `availability:write:own`, `client-record:read:own_assigned`, `client-record:write:own_assigned`, `services:read` |
| `customer` | `cart:*:own`, `orders:read:own`, `appointments:read:own`, `appointments:write:own`, `me:*` |

### Scoping
Aplicado manualmente en cada service. Patrón estándar:

```ts
async findAll(user: AuthUser) {
  if (user.permissions.includes('appointments:read')) {
    return this.prisma.appointment.findMany();
  }
  if (user.permissions.includes('appointments:read:own')) {
    if (user.role === 'specialist') {
      return this.prisma.appointment.findMany({
        where: { specialistId: user.specialistId },
      });
    }
    if (user.role === 'customer') {
      return this.prisma.appointment.findMany({
        where: { customerId: user.id },
      });
    }
  }
  throw new ForbiddenException();
}
```

## 6. Flujos de datos clave

### Compra de producto
1. Storefront agrega item → `POST /store/cart/items` (con `guest_token` cookie si no hay login).
2. Carrito persiste en DB.
3. Checkout → `POST /store/orders` crea `Order` en estado `pending` con snapshot de precios.
4. Storefront pide intent → `POST /store/payments/intent` devuelve datos para widget Wompi.
5. Cliente paga en widget.
6. Wompi llama webhook → backend valida firma → `Order.status = paid` → descuenta `Product.stock_quantity`.
7. Storefront hace polling a `GET /store/orders/:id` o recibe notificación → muestra página de confirmación.

### Agendamiento de cita
1. Storefront muestra servicios disponibles → `GET /store/services`.
2. Cliente elige servicio + fecha → `GET /store/availability?service_id=X&date=Y` devuelve slots libres.
3. Cliente elige slot + (si invitado) provee email/teléfono → `POST /store/appointments`.
4. Backend valida slot aún disponible (race condition: si dos clientes intentan el mismo slot, el segundo recibe `409 Conflict SLOT_TAKEN`).
5. Crea `Appointment { status: 'scheduled' }`, devuelve confirmación.
6. Cron job 8am del día siguiente: genera lista de citas del día → notifications expone `wa_me_link` por cita.
7. Admin entra a panel → ve lista de recordatorios → clica "Enviar" por cada uno → confirma cita por WhatsApp Business manualmente.

### Cancelación de cita
1. Cliente entra a `/me/appointments` → ve sus citas → "Cancelar".
2. `POST /store/appointments/:id/cancel`.
3. Backend valida: `scheduled_at` está a más de 24h → marca `cancelled`. Si menos de 24h → `400` con mensaje "Contacta al admin para cancelar".

## 7. Manejo de errores

- **Validación de input:** `class-validator` en DTOs. Filtro devuelve `400 Bad Request` con detalle por campo: `{ field, message }[]`.
- **Auth:** `401 Unauthorized` (token inválido/expirado), `403 Forbidden` (permisos insuficientes).
- **Not found:** `404 Not Found`.
- **Conflictos de negocio:** `409 Conflict` con código específico:
  - `SLOT_TAKEN` — slot ya reservado.
  - `OUT_OF_STOCK` — producto sin stock al confirmar pago.
  - `CANCELLATION_DEADLINE_PASSED` — cancelación tardía.
- **Errores no manejados:** filtro global de excepciones, log a Sentry (Fase 2), respuesta genérica `500 Internal Server Error`.
- **Webhook Wompi:** si validación de firma falla → `401`. Si la firma es válida pero hay error procesando → `500` con log persistente. Wompi reintenta automáticamente.

## 8. Testing

### Cobertura

- **Unit tests (Jest)** para todos los services. Mock de Prisma con `jest-mock-extended`. Cobertura objetivo: 70%.
- **Integration tests** SOLO para dos flujos críticos (decisión consciente del dev — el resto se cubre con unitarios):
  - **Webhook Wompi → Order → Stock:** flujo completo desde POST al webhook hasta verificar `Order.status` y `Product.stock_quantity` en DB.
  - **Generación de slots de availability:** cubre edge cases (vacaciones, almuerzo, cita a caballo, día sin disponibilidad).
- DB de prueba: testcontainers (Postgres en docker) o docker-compose dedicado.

### Lo que NO se testea en MVP
- E2E con Playwright (queda para Fase 3).
- Tests de UI (admin/storefront) más allá de smoke tests manuales.
- Tests de carga.

## 9. Habeas Data (Ley 1581/2012)

- **Campos sensibles encriptados** en `client-record` con AES-256-GCM. Llave en `CLIENT_RECORD_ENCRYPTION_KEY` (Railway secret, rotable).
- **Consentimientos versionados:** tabla `Consent { id, customer_id, version, accepted_at, ip, policy_text_snapshot }`. Cada cambio en la política de tratamiento de datos crea una nueva versión; el cliente debe re-aceptar.
- **Derecho al olvido:** endpoint `DELETE /me/account`. Borrado real (no soft delete) de datos personales, manteniendo solo agregados anonimizados en `analytics` (ej. `total_orders_by_month` sin asociación a `customer_id`).
- **Audit log:** tabla `data_access_log` registra cada acceso a `client-record` por staff. Consultable por admin.
- **Documentación de política:** página pública `/politica-tratamiento-datos` en storefront, archivada por versión.

## 10. Seed de datos iniciales

Script `prisma/seed.ts` (no migración del repo viejo, arranca limpio):

- Roles base: `admin`, `finance`, `specialist`, `customer`.
- Permisos base (lista de sección 5).
- Asignación rol → permisos.
- Usuario admin inicial (`admin@bymariap.com` con password definida por variable de entorno `SEED_ADMIN_PASSWORD`).
- 1 servicio de ejemplo en dev (`Diseño de Cejas`, 45 min, $50.000 COP).
- 1 zona de envío "Medellín área metropolitana" precio $10.000 COP + opción "Recogida en tienda" precio 0.
- En dev opcional: 10 productos de muestra, 3 categorías. Controlado por flag `SEED_DEMO_DATA=true`.

## 11. Plan de ejecución estimado

Estimación gruesa para dev solo full-time. Con interrupciones puede tomar 12-14 semanas reales.

| Semana | Hito |
|---|---|
| 1 | Setup `apps/api` (Nest), Prisma + schema completo, `auth` + `rbac` + seed + tests unitarios. |
| 2-3 | `users` + `specialists`, `products` + `categories`, endpoints admin. Migración inicial de admin a Vite (auth + listado productos). |
| 4 | `cart` + `orders` + máquina de estados. `payments` (Wompi webhook + integration test). |
| 5-6 | Storefront (Next.js) nuevo: catálogo, carrito, checkout, confirmación de orden. Conectado a nuevo backend. |
| 7-8 | `services` + `availability` (con integration test de slots) + `appointments`. UI admin para gestionar agenda. Storefront para reservar cita. |
| 9 | `client-record` + encriptación + consentimientos + audit log. UI admin para fichas. `notifications` con WhatsApp asistido. Cron de recordatorios. |
| 10 | `analytics` (dashboards básicos). QA manual. Deploy a Railway + Vercel. Documentación de política Habeas Data. |

## 12. Cosas explícitamente fuera del MVP (YAGNI)

- Variantes de producto
- Cupones / descuentos
- Impuestos discriminados (IVA)
- Devoluciones formales (workflow RMA)
- Facturación electrónica DIAN
- Múltiples direcciones por cliente
- Productos digitales / cursos online
- Bloqueo de stock al agregar al carrito
- Pago anticipado de cita
- WhatsApp 100% automático (queda como Fase 3, switch interno del módulo `notifications`)
- Login social (Google/Apple)
- Multi-tienda / multi-región
- E2E tests con Playwright
- Sentry / observability avanzada
- Migración de datos del repo viejo (Medusa) — arranca limpio

Estos NO se diseñan ahora. Si alguno entra al alcance en el futuro, se diseña aparte.

## 13. Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| Tiempo de migración (10-14 semanas sin features nuevas) | Repo viejo queda usable como demo si stakeholders lo necesitan. |
| Verificación Cloud API WhatsApp toma 1-2 semanas | MVP arranca con botón asistido (no bloquea lanzamiento). |
| Race conditions en agendamiento de slots | Constraint único `(specialist_id, scheduled_at)` en DB + manejo de `409 Conflict`. |
| Encriptación mal implementada en `client-record` | Tests unitarios obligatorios sobre el helper de cripto antes de tocar otros módulos. Llave rotable. |
| Webhook Wompi llega duplicado / fuera de orden | Tabla `webhook_log` con idempotencia por `event_id` de Wompi. |
| Dev solo + curva NestJS | Solo patrones estándar Nest (controllers, services, modules, guards, interceptors). Nada de CQRS, microservices, ni magia avanzada. |
