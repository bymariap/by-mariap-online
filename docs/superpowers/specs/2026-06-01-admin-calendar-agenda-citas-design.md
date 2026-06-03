# Diseño: Calendario para "Mi agenda" y "Citas" (Admin)

**Fecha:** 2026-06-01
**Estado:** Aprobado (brainstorming)
**Alcance:** Rediseño UI/UX de las páginas `Mi agenda` y `Citas` del panel admin, reemplazando las tablas actuales por un calendario. Incluye los cambios de backend necesarios para que el admin gestione la disponibilidad de cualquier especialista.

---

## Objetivo

Convertir `Mi agenda` y `Citas` de tablas planas a una experiencia de **calendario** (Mes / Semana / Día) más amigable, manteniendo la estética minimalista del admin y los flujos de negocio existentes.

## Decisiones tomadas (brainstorming)

1. **Vistas:** un único calendario con selector **Mes / Semana / Día** y navegación `‹ Hoy ›`.
2. **Vista por defecto:** `Mi agenda` → **Semana**; `Citas` → **Día** (ambas con switcher).
3. **Crear disponibilidad:** botón **+ Publicar disponibilidad** con formulario (fecha + hora inicio + hora fin). NO drag&drop. Atajo: clic en celda vacía abre el formulario con fecha/hora prellenadas.
4. **Implementación:** **calendario a medida (custom) con `date-fns` + `date-fns-tz`**, no librería de terceros. Encaja con el estilo, bundle ligero, control total.
5. **Admin gestiona todas las agendas:** el admin puede ver y **editar** (crear/eliminar) la disponibilidad de cualquier especialista. El especialista solo la suya.
6. **Citas:** vista Día con **una columna por especialista**, bloques coloreados por estado, popover de acciones al hacer clic, y **toggle Calendario / Lista** (la tabla actual se conserva como vista "Lista").

## Zona horaria

Todo el manejo de fechas/horas se ancla a **`America/Bogota`** con `date-fns-tz`, igual que el backend. Las citas llegan en UTC y se convierten a hora local para posicionarlas en la rejilla. La disponibilidad ya se almacena como minutos-desde-medianoche en hora local.

---

## Arquitectura

### Componente compartido `Calendar` (`apps/admin/src/components/calendar/`)

De **solo presentación**: recibe los bloques a pintar y emite eventos. No conoce disponibilidad ni citas — cada página le pasa sus datos. Esto lo mantiene aislado y testeable, y reutilizable entre ambas páginas.

- **`calendar-utils.ts`** — funciones **puras** con date-fns/tz (núcleo testeable, análogo a `slot-generator`):
  - construir la rejilla del mes (semanas × días).
  - construir las franjas horarias de semana/día.
  - navegación: `today()`, `prev(view, date)`, `next(view, date)`, y el rango `[from, to]` visible según la vista (para consultar al backend).
  - posicionar un bloque: dado un instante UTC + duración, calcular su día/columna y offset/altura en hora local Bogotá.
- **`calendar.tsx`** — contenedor: toolbar (toggle Mes/Semana/Día, `‹ Hoy ›`, título del rango) + las tres sub-vistas (`MonthView`, `WeekView`, `DayView`). Props:
  - `blocks: CalendarBlock[]` — genérico.
  - `view`, `date`, `onViewChange`, `onDateChange`.
  - `onSelectDate(date, time?)` — clic en celda vacía.
  - `onSelectBlock(blockId)` — clic en un bloque.
  - `columns?` — para la vista Día con columnas por especialista.

```ts
interface CalendarBlock {
  id: string;
  start: string;      // ISO UTC
  end: string;        // ISO UTC
  label: string;
  color: string;      // token de color (por estado o por tipo)
  columnKey?: string; // especialista, para vista Día por columnas
}
```

### Tipos de bloque por página

- `Mi agenda` / `Agenda`: bloques de **disponibilidad** (beige, un color).
- `Citas`: bloques de **cita** coloreados por estado:
  - `scheduled` → primario (beige/marrón)
  - `completed` → verde apagado
  - `no_show` → gris azulado
  - `cancelled` → gris claro (tachado)

---

## Backend (cambios)

### 1. Permiso nuevo

Añadir `"availability:write"` al array de permisos del seed. **No** se asigna al rol `specialist` (mantiene solo `availability:write:own`); el `admin` lo cubre por su wildcard `*`. Esto protege las rutas admin: un especialista no puede editar agendas ajenas.

### 2. AvailabilityController — rutas admin de escritura

- **`POST /admin/availability`** `@RequirePermissions('availability:write')`
  Body: `{ specialistId, date, startMinute, endMinute }`. Llama a `AvailabilityService.publish(specialistId, dto)` (ya valida `start < end`).
  Nuevo DTO `AdminPublishAvailabilityDto` = `PublishAvailabilityDto` + `specialistId`.
- **`DELETE /admin/availability/:id`** `@RequirePermissions('availability:write')`
  Llama a `AvailabilityService.removeAny(id)`.
- Ya existe: `GET /admin/availability?specialistId&fromDate&toDate` (`availability:read`).

### 3. AvailabilityService

- **`removeAny(id)`** (nuevo): busca por id; si no existe → `NotFoundException`; elimina **sin** chequeo de propiedad. (`remove(specialistId, id)` se mantiene para `/me`.)

### 4. AppointmentsController — filtro por rango

- **`GET /admin/appointments`** acepta params opcionales **`from`** y **`to`** (ISO) además del `status` existente, para traer solo las citas del rango visible del calendario. `AppointmentsService.listAdmin` se extiende para filtrar por `scheduledAt` en `[from, to)` cuando se proveen.

### Sin cambios

`slot-generator`, `getSlots`, las rutas `/me/availability` (especialista), `PATCH /admin/appointments/:id/status`, el storefront, y todos los flujos de negocio.

---

## Frontend (páginas)

### `availability-page.tsx` (Mi agenda / Agenda) — reescrita

- Usa `Calendar` en vista **Semana** por defecto.
- **Especialista puro:** ve y edita su propia agenda (datos vía `/me/availability`), sin selector.
- **Admin:** muestra un **selector de especialista** (dropdown poblado con `/admin/specialists`); ve/edita la agenda del seleccionado (datos vía `/admin/availability`). Si el admin tiene perfil propio, aparece en el dropdown.
- Crear: botón **+ Publicar disponibilidad** (o clic en celda) → formulario (fecha + inicio + fin). El especialista publica en `/me/availability`; el admin en `/admin/availability` (con `specialistId`).
- Eliminar: clic en bloque → popover con horario + **Eliminar** (confirmación). Especialista vía `/me/availability/:id`; admin vía `/admin/availability/:id`.
- **Nav:** el item conserva la etiqueta **"Mi agenda"** (la página se adapta internamente según el rol). Su condición de visibilidad pasa de `hasSpecialistProfile` a **`isAdmin || hasSpecialistProfile`**, para que el admin sin perfil propio también pueda gestionar las agendas de otros.

### `appointments-page.tsx` (Citas) — reescrita

- Usa `Calendar` en vista **Día** por defecto, con **una columna por especialista** (columnas vía `/admin/specialists`).
- Citas como bloques coloreados por estado; datos vía `/admin/appointments?from&to(&status)`.
- **Toggle Calendario / Lista:** "Lista" conserva la tabla actual (escaneo/filtrado rápido).
- Filtro por estado se mantiene; el filtro por especialista es implícito en las columnas.
- Clic en cita → **popover** con cliente, servicio, hora, teléfono + acciones (**Completada / No asistió / Cancelar**) solo si está `scheduled`. Reusa `PATCH /admin/appointments/:id/status`.

### Dependencias

Añadir `date-fns` + `date-fns-tz` al `package.json` de `apps/admin` (ya usadas en el backend).

---

## Testing (TDD)

- **`calendar-utils.ts`**: tests unitarios exhaustivos (construcción de rejilla mensual, franjas semana/día, navegación hoy/prev/next, cálculo de rango visible, conversión UTC↔Bogotá y posicionamiento de bloques). Núcleo crítico, sin dependencias de React.
- **Backend nuevo**: `removeAny` (elimina sin ownership; 404 si no existe) y `listAdmin` con filtro `from/to`. Tests de servicio con mocks, como el resto del proyecto.
- **Páginas**: smoke test de render (calendario monta, cambia de vista, dispara callbacks).

---

## Fuera de alcance

- Drag & drop para crear/mover/redimensionar (se eligió formulario).
- Reagendar una cita arrastrándola (las acciones son completar/no_show/cancelar).
- Calendario en el storefront (solo admin).
- Exportar a `.ics`, recordatorios, sincronización con Google Calendar.
- Librerías de calendario de terceros.
