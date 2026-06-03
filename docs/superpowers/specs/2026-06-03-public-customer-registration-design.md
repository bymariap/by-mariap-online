# Public Customer Registration — Design

**Fecha:** 2026-06-03
**Autor:** Theodoro Dikuyama (con asistencia)
**Estado:** Diseño aprobado — pendiente plan de implementación
**Relación:** Addendum a la rearquitectura NestJS (`2026-05-14-rearquitectura-nest-design.md`). Se ejecuta **después del Plan 6** (depende de `Consent` + política vigente).

## 1. Contexto y motivación

La rearquitectura asume un modelo "guest-first": el cliente compra (Plan 3) y agenda (Plan 5) como invitado sin obligación de tener cuenta, y las cuentas con login las crea el admin (Plan 1, `POST /admin/users`). No existe auto-registro público.

Falta una vía para que un visitante cree su propia cuenta `customer` desde el storefront, necesaria para: ver historial de pedidos/citas (`/mi-cuenta`), gestionar privacidad/consentimiento (Plan 6), y agilizar checkouts futuros.

Este documento define ese registro público. No estaba en el spec original — es una adición consciente.

## 2. Alcance

### Dentro
- Endpoint público `POST /auth/register` que crea un `User` con rol `customer`, lo deja logueado (cookies), registra su consentimiento Habeas Data y mergea su carrito de invitado.
- Página `/registro` en el storefront.
- Rate limiting básico por IP en el endpoint.

### Fuera (YAGNI / fases futuras)
- Verificación de email (sin infraestructura de correo en el MVP).
- Reclamar pedidos/citas previos hechos como invitado con el mismo email.
- Captcha.
- Login social.
- Recuperación de contraseña (flujo aparte, futuro).

## 3. Decisiones de diseño

| Tema | Decisión |
|---|---|
| Verificación de email | **No** en MVP. El usuario queda logueado de inmediato tras registrarse. |
| Datos de invitado | Solo se **mergea el carrito** (vía `guest_token`, reutiliza `CartService.mergeGuestIntoUser`). Pedidos/citas previos NO se reclaman. |
| Consentimiento | **Obligatorio.** Checkbox que exige aceptar la política vigente. Al crear la cuenta se inserta un `Consent` (versión vigente + IP + snapshot). Depende del Plan 6. |
| Anti-abuso | **Rate limiting por IP** con `@nestjs/throttler` (5/min en register). Sin captcha. |
| Email duplicado | `409` con **mensaje claro** "Ya existe una cuenta con este email" + link a login. Se acepta que revela existencia (riesgo de enumeración bajo para este negocio; el throttling mitiga scraping). |
| Teléfono | **Obligatorio.** El negocio lo usa para recordatorios WhatsApp y contacto; checkout/booking de invitado ya lo exigen. |
| Rol | Forzado a `customer` por el backend. El cliente no puede elegir rol. |

## 4. Backend

### 4.1 Endpoint
`POST /auth/register` — `@Public()`, en el `AuthController` existente, con `@Throttle` específico.

**Request body (`RegisterDto`):**
```ts
{
  email: string;              // @IsEmail
  password: string;           // @MinLength(8)
  fullName: string;           // @Length(2, 80)
  phone: string;              // @Length(7, 20) — obligatorio
  acceptPolicyVersion: string; // @IsString — versión de política que el usuario aceptó
}
```

**Respuestas:**
- `201` → setea cookies `access_token` + `refresh_token`, devuelve `{ ok: true }` (mismo contrato que login).
- `400` → validación de DTO, o `acceptPolicyVersion` ausente/desactualizada respecto a la vigente.
- `409` → email duplicado, mensaje "Ya existe una cuenta con este email".
- `429` → rate limit excedido.

### 4.2 `AuthService.register(dto, ip, guestToken?)`
Secuencia:
1. **Valida consentimiento:** consulta la política vigente (`ConsentService.getStatus`/política current). Si `dto.acceptPolicyVersion` no coincide con la versión vigente → `BadRequestException`. (Evita aceptar una versión obsoleta cacheada en el front.)
2. **Resuelve rol:** `roleId` del rol `customer` (debe existir por el seed del Plan 1).
3. **Crea usuario** dentro de una transacción:
   - `User { email, passwordHash: bcrypt(password, 12), fullName, phone, roleId: customer }`.
   - Si `prisma` lanza `P2002` (unique email) → `ConflictException('Ya existe una cuenta con este email')`.
   - Inserta el `Consent` (reutiliza la lógica de `ConsentService.accept`: versión vigente + ip + snapshot del texto).
4. **Emite tokens:** reutiliza `issueTokens(user)` (ya existe; persiste el refresh token hasheado).
5. Devuelve el `TokenPair`.

> El merge de carrito y el seteo de cookies se hacen en el controller (igual que en `login`), no en el service, para mantener el service agnóstico de HTTP.

### 4.3 Controller
El handler de `register` replica el patrón de `login`:
- Llama `auth.register(...)`.
- `writeCookies(res, tokens)`.
- Si hay `guest_token` cookie → `cart.mergeGuestIntoUser(guestToken, userId)` + `clearGuestToken(res)`. El `userId` se obtiene decodificando el access token recién emitido (reutiliza el helper `decodeUserId` ya introducido en Plan 3 Task 7).
- `res.json({ ok: true })`.

### 4.4 Rate limiting
- Instalar `@nestjs/throttler`, registrar `ThrottlerModule.forRoot` (ej. default 60/min global) y `ThrottlerGuard` como guard global (junto a los existentes).
- `@Throttle({ default: { limit: 5, ttl: 60_000 } })` sobre `register` (y conviene sobre `login`).
- El `ThrottlerGuard` debe respetar `@Public()` (no requiere auth; throttle aplica igual).

## 5. Storefront

### 5.1 Página `/registro`
Client component con `react-hook-form` + `zod`:
- Campos: `fullName`, `email`, `password`, `phone`, checkbox `acceptPolicy`.
- El checkbox enlaza a `/politica-tratamiento-datos` y es obligatorio (zod `.literal(true)`).
- Antes de enviar, obtiene la versión vigente de la política (`GET /store/policy/current`) para mandar `acceptPolicyVersion`.
- Al éxito: invalida `['me']`, redirige a `searchParams.next ?? '/mi-cuenta'`.
- Maneja `409` → toast "Ya existe una cuenta con este email" + link visible a `/login`.

### 5.2 Hook
`useRegister` en `lib/auth/hooks.ts` (mutation a `/auth/register`, invalida `['me']` on success).

### 5.3 Enlaces
- En `/login`: "¿No tienes cuenta? Regístrate" → `/registro`.
- En `/checkout` (sección invitado): "¿Prefieres crear una cuenta?" → `/registro?next=/checkout`.

## 6. Manejo de errores

| Caso | Código | Mensaje |
|---|---|---|
| Validación DTO | 400 | detalle por campo `{ field, message }[]` |
| Política desactualizada / no aceptada | 400 | "Debes aceptar la versión vigente de la política" |
| Email duplicado | 409 | "Ya existe una cuenta con este email" |
| Rate limit | 429 | (respuesta estándar del throttler) |

## 7. Testing

- **Unit (`AuthService.register`):**
  - Crea customer + consent + tokens en happy path.
  - Rechaza `acceptPolicyVersion` distinta a la vigente (400).
  - Traduce `P2002` a 409.
  - Fuerza rol `customer` aunque el body intente otra cosa (no hay campo rol, pero se verifica que se resuelve `customer`).
- **Controller:** setea cookies + mergea carrito cuando hay `guest_token`.
- **Throttler:** test de que el 6º intento en la ventana devuelve 429 (puede ser un e2e ligero o unit del guard config).
- Sin nuevos modelos Prisma → sin migración.

## 8. Dependencias y orden

- **Requiere Plan 6 ejecutado** (tabla `Consent`, `PolicyVersion`, política v1.0 seeded, `ConsentService`).
- Reutiliza de planes previos: `hashPassword` (P1), `issueTokens`/`writeCookies`/`decodeUserId` (P1/P3), `CartService.mergeGuestIntoUser`/`guest-token` helpers (P3), `ConsentService` (P6), página `/politica-tratamiento-datos` y `lib/auth/hooks` (P4/P6).
- No depende de Plan 7 (analytics/deploy).

## 9. Criterios de aceptación

- `POST /auth/register` crea un `customer`, lo deja logueado (cookies válidas), e inserta un `Consent` con la versión vigente + IP.
- Registrarse con `guest_token` presente mergea el carrito y limpia la cookie.
- Email duplicado → 409 con mensaje claro.
- `acceptPolicyVersion` ausente o distinta de la vigente → 400.
- El rol siempre es `customer`, nunca elegible por el cliente.
- 6+ registros desde la misma IP en 1 min → 429.
- `/registro` valida en cliente, exige el checkbox, y al éxito redirige a `/mi-cuenta` (o `next`).
- Links a `/registro` desde login y checkout.
- Unit + controller tests verdes; `next build` limpio.
