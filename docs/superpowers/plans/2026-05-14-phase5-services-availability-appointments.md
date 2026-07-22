# Phase 5: Services + Availability + Appointments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the booking system end-to-end: services catalog, specialist-published availability windows, slot generation with all spec edge cases, appointment booking (guest + logged), state machine, 24-hour cancellation rule, race-condition handling. Includes admin agenda UI (services CRUD, specialist availability publishing, appointments list) and storefront booking flow (services list, booking page with date → slot picker, my-appointments).

**Architecture:**
- **Backend:** three modules — `services`, `availability`, `appointments`. Availability is published by specialists as date-bounded time windows. Slot generation produces fixed-grid candidates (`:00` / `:30`) from each window, drops any whose `[start, start+duration)` interval overlaps a scheduled appointment for that specialist. Booking validates the slot a second time inside a transaction and relies on the unique `(specialist_id, scheduled_at)` constraint to catch the residual exact-second race (per spec §13).
- **Admin:** new Vite pages — Servicios (CRUD), Mi agenda (publish availability — specialist role) / Agenda (admin sees all), Citas (list + status transitions).
- **Storefront:** new Next.js pages — `/servicios`, `/servicios/[slug]` (booking page with date+slot picker), `/mi-cuenta/citas` (list + cancel). Design source remains the Stitch project "Cejas Medellín Studio" (id `5755618256776589056`); the agent must call `mcp__stitch__get_screen` for any booking-related screens before writing code, and fall back to the existing storefront design tokens if no dedicated screen exists.

**Tech Stack:** Same as previous phases. New: `date-fns` (`zonedTimeToUtc`, `format`) for Colombia time-zone handling (America/Bogota).

**Prerequisites:** Phases 1-4 executed and merged. Roles `specialist` and `customer` exist with the permissions seeded in Phase 1 (`appointments:*`, `availability:write:own`, `services:read`).

**Scope (does NOT include):** payment for appointments (spec: pago en sitio, MVP), specialist-team scheduling beyond per-specialist, recurring availability templates, calendar exports (.ics), reminders to customers (Phase 6 covers admin-side WhatsApp), waiting lists, multi-room scheduling, no-show automation.

---

## File Structure (changes from Phase 4)

```
apps/api/
├── prisma/
│   ├── schema.prisma                                # +Service, SpecialistAvailability, Appointment, AppointmentStatus
│   └── seed.ts                                      # +default service (Diseño de Cejas)
└── src/
    ├── app.module.ts                                # +ServicesModule, AvailabilityModule, AppointmentsModule
    └── modules/
        ├── services/
        │   ├── services.module.ts
        │   ├── services.controller.ts
        │   ├── services.service.ts
        │   ├── services.service.spec.ts
        │   └── dto/
        │       ├── create-service.dto.ts
        │       └── update-service.dto.ts
        ├── availability/
        │   ├── availability.module.ts
        │   ├── availability.controller.ts
        │   ├── availability.service.ts
        │   ├── availability.service.spec.ts
        │   ├── slot-generator.ts                    # pure function — tested in isolation
        │   ├── slot-generator.spec.ts
        │   └── dto/
        │       ├── publish-availability.dto.ts
        │       └── list-availability.query.ts
        └── appointments/
            ├── appointments.module.ts
            ├── appointments.controller.ts
            ├── appointments.service.ts
            ├── appointments.service.spec.ts
            └── dto/
                ├── create-appointment.dto.ts
                └── update-appointment-status.dto.ts

apps/api/test/
└── availability-slots.e2e-spec.ts                   # integration test with real DB for slot edge cases

apps/admin/src/features/
├── services/
│   ├── services-page.tsx
│   ├── service-form-dialog.tsx
│   └── api.ts
├── availability/
│   ├── availability-page.tsx                        # mine / specialist
│   ├── availability-window-dialog.tsx
│   └── api.ts
└── appointments/
    ├── appointments-page.tsx                        # admin / specialist
    └── api.ts

apps/storefront/src/
├── app/
│   ├── servicios/
│   │   ├── page.tsx                                 # services list
│   │   └── [slug]/page.tsx                          # booking page
│   └── mi-cuenta/
│       └── citas/page.tsx                           # my appointments
├── components/
│   ├── service-card.tsx
│   ├── date-slot-picker.tsx
│   └── appointment-status-pill.tsx
└── lib/booking/api.ts

packages/types/src/index.ts                          # +ServiceDTO, AvailabilityWindowDTO, AppointmentDTO, AppointmentStatus, AvailableSlotDTO
```

---

## Task 1: Extend Prisma schema for services / availability / appointments

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [x] **Step 1: Append models**

Append after the existing `WebhookLog` model:

```prisma
// ---------- Services ----------

enum ServiceStatus {
  draft
  published
  archived
}

model Service {
  id              String        @id @default(cuid())
  name            String
  slug            String        @unique
  description     String?
  durationMinutes Int
  priceCop        Int
  status          ServiceStatus @default(draft)
  appointments    Appointment[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  @@index([status])
}

// ---------- Availability ----------

model SpecialistAvailability {
  id           String     @id @default(cuid())
  specialistId String
  specialist   Specialist @relation(fields: [specialistId], references: [id], onDelete: Cascade)
  // Stored as the local date in America/Bogota.
  date         DateTime   @db.Date
  // Times stored as minutes-from-midnight in local Bogota time (e.g. 09:00 = 540).
  startMinute  Int
  endMinute    Int
  createdAt    DateTime   @default(now())
  @@index([specialistId, date])
}

// ---------- Appointments ----------

enum AppointmentStatus {
  scheduled
  completed
  cancelled
  no_show
}

model Appointment {
  id              String            @id @default(cuid())
  customerId      String?
  customer        User?             @relation("CustomerAppointments", fields: [customerId], references: [id])
  guestEmail      String?
  guestPhone      String?
  guestFullName   String?
  specialistId    String
  specialist      Specialist        @relation(fields: [specialistId], references: [id])
  serviceId       String
  service         Service           @relation(fields: [serviceId], references: [id])
  scheduledAt     DateTime          // UTC instant
  durationMinutes Int
  status          AppointmentStatus @default(scheduled)
  notes           String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  @@unique([specialistId, scheduledAt])
  @@index([customerId])
  @@index([scheduledAt])
}
```

- [x] **Step 2: Update the `Specialist` model in the same file** so the back-relations resolve

Find the existing `model Specialist` block and replace it with:

```prisma
model Specialist {
  id           String                   @id @default(cuid())
  userId       String                   @unique
  user         User                     @relation(fields: [userId], references: [id], onDelete: Cascade)
  bio          String?
  specialties  String[]                 @default([])
  avatarUrl    String?
  availability SpecialistAvailability[]
  appointments Appointment[]
}
```

- [x] **Step 3: Update the `User` model** to add the named back-relation

Replace the `User` model — only add the new `appointments` relation alongside everything else that already exists:

```prisma
model User {
  id            String         @id @default(cuid())
  email         String         @unique
  passwordHash  String
  fullName      String
  phone         String?
  roleId        String
  role          Role           @relation(fields: [roleId], references: [id])
  specialist    Specialist?
  refreshTokens RefreshToken[]
  consents      Consent[]
  appointments  Appointment[]  @relation("CustomerAppointments")
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}
```

- [x] **Step 4: Create migration**

Run:
```bash
pnpm --filter @bymariap/api prisma migrate dev --name services_availability_appointments
```

Expected: new migration directory; `Service`, `SpecialistAvailability`, `Appointment` tables + `ServiceStatus` and `AppointmentStatus` enums exist.

- [x] **Step 5: Commit**

```bash
git add apps/api/prisma
git commit -m "feat(api): prisma models for services, specialist availability, appointments"
```

---

## Task 2: Shared types

**Files:**
- Modify: `packages/types/src/index.ts`

- [x] **Step 1: Append**

```ts
export type ServiceStatus = 'draft' | 'published' | 'archived';

export interface ServiceDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  priceCop: number;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityWindowDTO {
  id: string;
  specialistId: string;
  date: string;        // YYYY-MM-DD in America/Bogota
  startMinute: number; // local minute-of-day
  endMinute: number;
}

export interface AvailableSlotDTO {
  startAt: string;     // ISO UTC instant
  localTime: string;   // "HH:mm" in America/Bogota for display
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface AppointmentDTO {
  id: string;
  customerId: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  guestFullName: string | null;
  specialistId: string;
  specialistName: string;
  serviceId: string;
  serviceName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
}
```

- [x] **Step 2: Commit**

```bash
git add packages/types
git commit -m "feat(types): service, availability, appointment DTOs"
```

---

## Task 3: ServicesService + controller (TDD)

**Files:**
- Create: `apps/api/src/modules/services/services.service.ts`
- Create: `apps/api/src/modules/services/services.service.spec.ts`
- Create: `apps/api/src/modules/services/services.controller.ts`
- Create: `apps/api/src/modules/services/services.module.ts`
- Create: `apps/api/src/modules/services/dto/create-service.dto.ts`
- Create: `apps/api/src/modules/services/dto/update-service.dto.ts`
- Modify: `apps/api/src/app.module.ts`

- [x] **Step 1: Write DTOs**

`create-service.dto.ts`:
```ts
import { IsEnum, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { ServiceStatus } from '@prisma/client';

export class CreateServiceDto {
  @IsString() @Length(2, 80)  name!: string;
  @IsString() @Length(2, 80) @Matches(/^[a-z0-9-]+$/) slug!: string;
  @IsOptional() @IsString() @Length(0, 2000) description?: string;
  @IsInt() @Min(5) durationMinutes!: number;
  @IsInt() @Min(0) priceCop!: number;
  @IsEnum(ServiceStatus) status!: ServiceStatus;
}
```

`update-service.dto.ts`:
```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceDto } from './create-service.dto';
export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
```

- [x] **Step 2: Write failing test `services.service.spec.ts`**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ServicesService } from './services.service';

const prisma = mock<PrismaService>();
const svc = new ServicesService(prisma);

describe('ServicesService', () => {
  beforeEach(() => mockReset(prisma));

  it('lists published services to the public', async () => {
    (prisma.service as any).findMany.mockResolvedValueOnce([{
      id: 's1', name: 'Cejas', slug: 'cejas', description: null,
      durationMinutes: 45, priceCop: 50000, status: 'published',
      createdAt: new Date(), updatedAt: new Date(),
    }]);
    await svc.findPublic();
    const call = (prisma.service.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.status).toBe('published');
  });

  it('admin list includes all statuses', async () => {
    (prisma.service as any).findMany.mockResolvedValueOnce([]);
    await svc.findAdmin();
    const call = (prisma.service.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({});
  });

  it('throws 409 on duplicate slug', async () => {
    (prisma.service as any).create.mockRejectedValueOnce(
      Object.assign(new Error(), { code: 'P2002' }),
    );
    await expect(svc.create({
      name: 'X', slug: 'x', durationMinutes: 30, priceCop: 1, status: 'draft' as any,
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws 404 on update missing', async () => {
    (prisma.service as any).update.mockRejectedValueOnce(
      Object.assign(new Error(), { code: 'P2025' }),
    );
    await expect(svc.update('x', { name: 'Y' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [x] **Step 3: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- services.service.spec`.

- [x] **Step 4: Implement `services.service.ts`**

```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  findPublic() {
    return this.prisma.service.findMany({
      where: { status: 'published' }, orderBy: { name: 'asc' },
    });
  }

  findAdmin() {
    return this.prisma.service.findMany({ where: {}, orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    const s = await this.prisma.service.findUnique({ where: { id } });
    if (!s) throw new NotFoundException();
    return s;
  }

  async findBySlug(slug: string) {
    const s = await this.prisma.service.findUnique({ where: { slug } });
    if (!s) throw new NotFoundException();
    return s;
  }

  async create(dto: CreateServiceDto) {
    try {
      return await this.prisma.service.create({ data: dto });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('Slug already exists');
      throw e;
    }
  }

  async update(id: string, dto: UpdateServiceDto) {
    try {
      return await this.prisma.service.update({ where: { id }, data: dto });
    } catch (e: any) {
      if (e.code === 'P2025') throw new NotFoundException();
      if (e.code === 'P2002') throw new ConflictException('Slug already exists');
      throw e;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.service.delete({ where: { id } });
    } catch (e: any) {
      if (e.code === 'P2025') throw new NotFoundException();
      throw e;
    }
  }
}
```

- [x] **Step 5: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- services.service.spec`. Expected: 4 passing.

- [x] **Step 6: Write `services.controller.ts`**

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Controller()
export class ServicesController {
  constructor(private svc: ServicesService) {}

  @Public() @Get('store/services')                public_(){ return this.svc.findPublic(); }
  @Public() @Get('store/services/:slug')         bySlug(@Param('slug') slug: string){ return this.svc.findBySlug(slug); }

  @Get('admin/services')      @RequirePermissions('services:read')  list(){ return this.svc.findAdmin(); }
  @Get('admin/services/:id')  @RequirePermissions('services:read')  get(@Param('id') id: string){ return this.svc.findById(id); }
  @Post('admin/services')     @RequirePermissions('services:write') create(@Body() dto: CreateServiceDto){ return this.svc.create(dto); }
  @Patch('admin/services/:id') @RequirePermissions('services:write') update(@Param('id') id: string, @Body() dto: UpdateServiceDto){ return this.svc.update(id, dto); }
  @Delete('admin/services/:id') @RequirePermissions('services:write') remove(@Param('id') id: string){ return this.svc.remove(id); }
}
```

- [x] **Step 7: Write `services.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
```

- [x] **Step 8: Register in `apps/api/src/app.module.ts`**

Add `ServicesModule` to `imports`.

- [x] **Step 9: Build + commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src
git commit -m "feat(api): services CRUD (public + admin)"
```

---

## Task 4: Slot generator — pure function (TDD with all edge cases)

**Files:**
- Create: `apps/api/src/modules/availability/slot-generator.ts`
- Create: `apps/api/src/modules/availability/slot-generator.spec.ts`

- [x] **Step 1: Write failing test exhaustively**

```ts
import { generateSlots, Window, BusyInterval } from './slot-generator';

const W = (startMinute: number, endMinute: number): Window => ({ startMinute, endMinute });
const B = (startMinute: number, endMinute: number): BusyInterval => ({ startMinute, endMinute });

describe('generateSlots', () => {
  it('grid starts at first :00 or :30 ≥ window.start and skips slots that exceed window.end', () => {
    // 09:00-12:00, service 45min → 09:00, 09:30, 10:00, 10:30, 11:00 (11:30 exceeds)
    const out = generateSlots({ windows: [W(540, 720)], busy: [], durationMinutes: 45 });
    expect(out.map((s) => s.startMinute)).toEqual([540, 570, 600, 630, 660]);
  });

  it('snaps a window starting at 09:10 to 09:30', () => {
    const out = generateSlots({ windows: [W(550, 720)], busy: [], durationMinutes: 30 });
    expect(out[0].startMinute).toBe(570);
  });

  it('keeps the window start when it already lands on :00 / :30', () => {
    const out = generateSlots({ windows: [W(540, 720)], busy: [], durationMinutes: 30 });
    expect(out[0].startMinute).toBe(540);
  });

  it('drops slots overlapping a busy interval', () => {
    // window 09:00-12:00, busy 10:00-10:45 (45min), service 45min
    // 09:00 (09:00-09:45) → ok
    // 09:30 (09:30-10:15) → overlap with 10:00-10:45 → drop
    // 10:00 → conflict (exact) → drop
    // 10:30 (10:30-11:15) → overlap → drop
    // 11:00 (11:00-11:45) → ok
    const out = generateSlots({
      windows: [W(540, 720)], busy: [B(600, 645)], durationMinutes: 45,
    });
    expect(out.map((s) => s.startMinute)).toEqual([540, 660]);
  });

  it('handles multiple windows (e.g. lunch break 12:00-14:00)', () => {
    const out = generateSlots({
      windows: [W(540, 720), W(840, 1080)], busy: [], durationMinutes: 45,
    });
    // morning ends at 11:00 (last fitting), afternoon starts at 14:00 and last fitting is 17:00
    const minutes = out.map((s) => s.startMinute);
    expect(minutes).toContain(540);
    expect(minutes).toContain(660);
    expect(minutes).not.toContain(690); // 11:30 exceeds 12:00 window
    expect(minutes).toContain(840);
    expect(minutes).toContain(1020); // 17:00 (ends 17:45)
    expect(minutes).not.toContain(1050); // 17:30 exceeds 18:00
  });

  it('returns empty when no windows', () => {
    const out = generateSlots({ windows: [], busy: [], durationMinutes: 30 });
    expect(out).toEqual([]);
  });

  it('returns empty when service longer than every window', () => {
    const out = generateSlots({ windows: [W(540, 570)], busy: [], durationMinutes: 60 });
    expect(out).toEqual([]);
  });

  it('windows in unsorted order still work', () => {
    const out = generateSlots({
      windows: [W(840, 1080), W(540, 720)], busy: [], durationMinutes: 30,
    });
    expect(out[0].startMinute).toBeLessThan(out[out.length - 1].startMinute);
  });

  it('a busy interval that fully covers a window emits no slots in that window', () => {
    const out = generateSlots({
      windows: [W(540, 720)], busy: [B(540, 720)], durationMinutes: 30,
    });
    expect(out).toEqual([]);
  });

  it('back-to-back busy at end leaves earlier slots intact', () => {
    // window 09:00-12:00, busy 11:00-11:45, service 45min
    // 09:00, 09:30, 10:00 ok; 10:30 (10:30-11:15) overlap; 11:00 conflict
    const out = generateSlots({
      windows: [W(540, 720)], busy: [B(660, 705)], durationMinutes: 45,
    });
    expect(out.map((s) => s.startMinute)).toEqual([540, 570, 600]);
  });
});
```

- [x] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- slot-generator.spec`.

- [x] **Step 3: Implement `slot-generator.ts`**

```ts
export interface Window { startMinute: number; endMinute: number; }
export interface BusyInterval { startMinute: number; endMinute: number; }

export interface GenerateInput {
  windows: Window[];
  busy: BusyInterval[];
  durationMinutes: number;
}

export interface Slot { startMinute: number; }

const GRID_STEP = 30;

export function generateSlots(input: GenerateInput): Slot[] {
  const result: Slot[] = [];
  const windows = [...input.windows].sort((a, b) => a.startMinute - b.startMinute);
  for (const w of windows) {
    const firstSlot = nextGridStep(w.startMinute);
    for (let m = firstSlot; m + input.durationMinutes <= w.endMinute; m += GRID_STEP) {
      const slotEnd = m + input.durationMinutes;
      if (overlapsAny(m, slotEnd, input.busy)) continue;
      result.push({ startMinute: m });
    }
  }
  return result;
}

function nextGridStep(minute: number): number {
  const rem = minute % GRID_STEP;
  return rem === 0 ? minute : minute + (GRID_STEP - rem);
}

function overlapsAny(start: number, end: number, busy: BusyInterval[]): boolean {
  return busy.some((b) => start < b.endMinute && b.startMinute < end);
}
```

- [x] **Step 4: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- slot-generator.spec`. Expected: 10 passing.

- [x] **Step 5: Commit**

```bash
git add apps/api/src/modules/availability
git commit -m "feat(api): pure slot-generator with fixed :00/:30 grid + overlap exclusion"
```

---

## Task 5: AvailabilityService — publish & list windows (TDD)

**Files:**
- Create: `apps/api/src/modules/availability/availability.service.ts`
- Create: `apps/api/src/modules/availability/availability.service.spec.ts`
- Create: `apps/api/src/modules/availability/dto/publish-availability.dto.ts`
- Create: `apps/api/src/modules/availability/dto/list-availability.query.ts`

- [x] **Step 1: Install `date-fns-tz`**

Run: `pnpm --filter @bymariap/api add date-fns date-fns-tz`.

- [x] **Step 2: Write DTOs**

`publish-availability.dto.ts`:
```ts
import { IsDateString, IsInt, Max, Min } from 'class-validator';

export class PublishAvailabilityDto {
  @IsDateString() date!: string; // YYYY-MM-DD in Bogota tz
  @IsInt() @Min(0) @Max(1440) startMinute!: number;
  @IsInt() @Min(0) @Max(1440) endMinute!: number;
}
```

`list-availability.query.ts`:
```ts
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ListAvailabilityQuery {
  @IsOptional() @IsString() specialistId?: string;
  @IsDateString() fromDate!: string;
  @IsDateString() toDate!: string;
}
```

- [x] **Step 3: Write failing test**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from './availability.service';

const prisma = mock<PrismaService>();
const svc = new AvailabilityService(prisma);

describe('AvailabilityService.publish', () => {
  beforeEach(() => mockReset(prisma));

  it('creates a window for the specialist', async () => {
    (prisma.specialistAvailability as any).create.mockResolvedValueOnce({
      id: 'a1', specialistId: 's1', date: new Date('2026-06-01'),
      startMinute: 540, endMinute: 720, createdAt: new Date(),
    });
    const out = await svc.publish('s1', {
      date: '2026-06-01', startMinute: 540, endMinute: 720,
    });
    expect(out.id).toBe('a1');
  });

  it('rejects when start ≥ end', async () => {
    await expect(svc.publish('s1', {
      date: '2026-06-01', startMinute: 720, endMinute: 540,
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AvailabilityService.remove', () => {
  beforeEach(() => mockReset(prisma));

  it('only allows removing your own windows', async () => {
    (prisma.specialistAvailability as any).findUnique.mockResolvedValueOnce({
      id: 'a1', specialistId: 's2',
    });
    await expect(svc.remove('s1', 'a1')).rejects.toMatchObject({ status: 403 });
  });

  it('throws 404 when missing', async () => {
    (prisma.specialistAvailability as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.remove('s1', 'a1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [x] **Step 4: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- availability.service.spec`.

- [x] **Step 5: Implement `availability.service.ts`**

```ts
import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PublishAvailabilityDto } from './dto/publish-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async publish(specialistId: string, dto: PublishAvailabilityDto) {
    if (dto.startMinute >= dto.endMinute) {
      throw new BadRequestException('startMinute must be < endMinute');
    }
    return this.prisma.specialistAvailability.create({
      data: {
        specialistId,
        date: new Date(`${dto.date}T00:00:00.000Z`),
        startMinute: dto.startMinute,
        endMinute: dto.endMinute,
      },
    });
  }

  async listForSpecialist(specialistId: string, fromDate: string, toDate: string) {
    return this.prisma.specialistAvailability.findMany({
      where: {
        specialistId,
        date: {
          gte: new Date(`${fromDate}T00:00:00.000Z`),
          lte: new Date(`${toDate}T00:00:00.000Z`),
        },
      },
      orderBy: [{ date: 'asc' }, { startMinute: 'asc' }],
    });
  }

  async remove(specialistId: string, id: string) {
    const row = await this.prisma.specialistAvailability.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    if (row.specialistId !== specialistId) throw new ForbiddenException();
    await this.prisma.specialistAvailability.delete({ where: { id } });
  }
}
```

- [x] **Step 6: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- availability.service.spec`. Expected: 4 passing.

- [x] **Step 7: Commit**

```bash
git add apps/api/src/modules/availability pnpm-lock.yaml apps/api/package.json
git commit -m "feat(api): AvailabilityService.publish/list/remove with ownership check"
```

---

## Task 6: AvailabilityService — slot computation endpoint (TDD)

**Files:**
- Modify: `apps/api/src/modules/availability/availability.service.ts`
- Modify: `apps/api/src/modules/availability/availability.service.spec.ts`

- [x] **Step 1: Append failing tests**

```ts
import { ServicesService } from '../services/services.service';

describe('AvailabilityService.getSlots', () => {
  const services = mock<ServicesService>();
  const svc2 = new AvailabilityService(prisma, services);

  beforeEach(() => { mockReset(prisma); mockReset(services); });

  it('returns slot UTC instants for the day, excluding busy', async () => {
    services.findById.mockResolvedValueOnce({
      id: 'svc1', name: 'Cejas', slug: 'cejas', description: null,
      durationMinutes: 45, priceCop: 50000, status: 'published',
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    (prisma.specialistAvailability as any).findMany.mockResolvedValueOnce([
      {
        id: 'a1', specialistId: 's1',
        date: new Date('2026-06-01T00:00:00.000Z'),
        startMinute: 540, endMinute: 720, createdAt: new Date(),
      },
    ]);
    // existing scheduled appointment 10:00-10:45 local (Bogota = UTC-5),
    // so scheduledAt UTC = 2026-06-01T15:00:00Z
    (prisma.appointment as any).findMany.mockResolvedValueOnce([
      { scheduledAt: new Date('2026-06-01T15:00:00.000Z'), durationMinutes: 45 },
    ]);

    const slots = await svc2.getSlots({
      serviceId: 'svc1', specialistId: 's1', date: '2026-06-01',
    });

    // Local times: 09:00, 09:30, 11:00 (others overlap busy 10:00-10:45)
    expect(slots.map((s) => s.localTime)).toEqual(['09:00', '09:30', '11:00']);
    expect(slots[0].startAt).toBe(new Date('2026-06-01T14:00:00.000Z').toISOString());
  });

  it('returns [] when no availability for that date', async () => {
    services.findById.mockResolvedValueOnce({
      id: 'svc1', durationMinutes: 45, priceCop: 50000, name: 'X', slug: 'x',
      description: null, status: 'published',
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    (prisma.specialistAvailability as any).findMany.mockResolvedValueOnce([]);
    (prisma.appointment as any).findMany.mockResolvedValueOnce([]);
    const slots = await svc2.getSlots({
      serviceId: 'svc1', specialistId: 's1', date: '2026-06-01',
    });
    expect(slots).toEqual([]);
  });
});
```

- [x] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- availability.service.spec`.

- [x] **Step 3: Update `availability.service.ts`**

Add imports + new method. Replace the constructor too:

```ts
import { generateSlots } from './slot-generator';
import { ServicesService } from '../services/services.service';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

const BOGOTA = 'America/Bogota';

// Replace the constructor:
@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService, private services: ServicesService) {}
  // ... existing methods stay the same

  async getSlots(input: { serviceId: string; specialistId: string; date: string }) {
    const service = await this.services.findById(input.serviceId);

    const windows = await this.prisma.specialistAvailability.findMany({
      where: {
        specialistId: input.specialistId,
        date: new Date(`${input.date}T00:00:00.000Z`),
      },
    });

    // Pull existing scheduled appointments that touch this local date.
    // Local Bogota date YYYY-MM-DD spans UTC [date+05:00, date+05:00+24h).
    const dayStartUtc = fromZonedTime(`${input.date}T00:00:00`, BOGOTA);
    const dayEndUtc   = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000);

    const busyAppointments = await this.prisma.appointment.findMany({
      where: {
        specialistId: input.specialistId,
        status: 'scheduled',
        scheduledAt: { gte: dayStartUtc, lt: dayEndUtc },
      },
      select: { scheduledAt: true, durationMinutes: true },
    });

    const busy = busyAppointments.map((a) => {
      const localMinutes = utcInstantToLocalMinutes(a.scheduledAt, input.date);
      return { startMinute: localMinutes, endMinute: localMinutes + a.durationMinutes };
    });

    const slots = generateSlots({
      windows: windows.map((w) => ({ startMinute: w.startMinute, endMinute: w.endMinute })),
      busy,
      durationMinutes: service.durationMinutes,
    });

    return slots.map((s) => {
      const utc = fromZonedTime(
        `${input.date}T${pad(Math.floor(s.startMinute / 60))}:${pad(s.startMinute % 60)}:00`,
        BOGOTA,
      );
      return {
        startAt: utc.toISOString(),
        localTime: formatInTimeZone(utc, BOGOTA, 'HH:mm'),
      };
    });
  }
}

function pad(n: number): string { return String(n).padStart(2, '0'); }

function utcInstantToLocalMinutes(utc: Date, localDateYmd: string): number {
  // Returns minutes-from-midnight in Bogota for `utc`, knowing it falls on `localDateYmd`.
  const hh = Number(formatInTimeZone(utc, BOGOTA, 'HH'));
  const mm = Number(formatInTimeZone(utc, BOGOTA, 'mm'));
  return hh * 60 + mm;
}
```

- [x] **Step 4: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- availability.service.spec slot-generator.spec`. Expected all green.

- [x] **Step 5: Commit**

```bash
git add apps/api/src/modules/availability
git commit -m "feat(api): AvailabilityService.getSlots — Bogota tz, busy exclusion"
```

---

## Task 7: AvailabilityController + module

**Files:**
- Create: `apps/api/src/modules/availability/availability.controller.ts`
- Create: `apps/api/src/modules/availability/availability.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [x] **Step 1: Write controller**

```ts
import {
  BadRequestException, Body, Controller, Delete, Get, Param, Post, Query,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { AvailabilityService } from './availability.service';
import { PublishAvailabilityDto } from './dto/publish-availability.dto';
import { ListAvailabilityQuery } from './dto/list-availability.query';

@Controller()
export class AvailabilityController {
  constructor(private svc: AvailabilityService) {}

  @Public()
  @Get('store/availability')
  storeSlots(
    @Query('serviceId') serviceId: string,
    @Query('specialistId') specialistId: string,
    @Query('date') date: string,
  ) {
    if (!serviceId || !specialistId || !date) {
      throw new BadRequestException('serviceId, specialistId and date are required');
    }
    return this.svc.getSlots({ serviceId, specialistId, date });
  }

  // Specialist publishing their own windows.
  @Post('me/availability')
  @RequirePermissions('availability:write:own')
  publishMine(@CurrentUser() user: AuthUser, @Body() dto: PublishAvailabilityDto) {
    if (!user.specialistId) throw new BadRequestException('User is not a specialist');
    return this.svc.publish(user.specialistId, dto);
  }

  @Get('me/availability')
  @RequirePermissions('availability:write:own')
  listMine(@CurrentUser() user: AuthUser, @Query() q: ListAvailabilityQuery) {
    if (!user.specialistId) throw new BadRequestException('User is not a specialist');
    return this.svc.listForSpecialist(user.specialistId, q.fromDate, q.toDate);
  }

  @Delete('me/availability/:id')
  @RequirePermissions('availability:write:own')
  removeMine(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (!user.specialistId) throw new BadRequestException('User is not a specialist');
    return this.svc.remove(user.specialistId, id);
  }

  // Admin can read any specialist's windows.
  @Get('admin/availability')
  @RequirePermissions('availability:read')
  listAny(@Query() q: ListAvailabilityQuery) {
    if (!q.specialistId) throw new BadRequestException('specialistId required');
    return this.svc.listForSpecialist(q.specialistId, q.fromDate, q.toDate);
  }
}
```

- [x] **Step 2: Write `availability.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [ServicesModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
```

- [x] **Step 3: Register in `apps/api/src/app.module.ts`**

Add `AvailabilityModule` to `imports`.

- [x] **Step 4: Build + commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src
git commit -m "feat(api): availability controller (store slots + specialist publish)"
```

---

## Task 8: AppointmentsService — create with race protection (TDD)

**Files:**
- Create: `apps/api/src/modules/appointments/appointments.service.ts`
- Create: `apps/api/src/modules/appointments/appointments.service.spec.ts`
- Create: `apps/api/src/modules/appointments/dto/create-appointment.dto.ts`

- [x] **Step 1: Write DTO**

`create-appointment.dto.ts`:
```ts
import {
  IsDateString, IsEmail, IsOptional, IsString, Length,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsString() serviceId!: string;
  @IsString() specialistId!: string;
  @IsDateString() startAt!: string; // ISO UTC instant from /store/availability response

  @IsOptional() @IsEmail() guestEmail?: string;
  @IsOptional() @IsString() @Length(7, 20) guestPhone?: string;
  @IsOptional() @IsString() @Length(2, 80) guestFullName?: string;
  @IsOptional() @IsString() @Length(0, 500) notes?: string;
}
```

- [x] **Step 2: Write failing test**

```ts
import { mock, mockReset } from 'jest-mock-extended';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { ServicesService } from '../services/services.service';
import { AppointmentsService } from './appointments.service';

const prisma = mock<PrismaService>();
const availability = mock<AvailabilityService>();
const services = mock<ServicesService>();
const svc = new AppointmentsService(prisma, availability, services);

const service = {
  id: 'svc1', name: 'Cejas', slug: 'cejas', description: null,
  durationMinutes: 45, priceCop: 50000, status: 'published' as const,
  createdAt: new Date(), updatedAt: new Date(),
};

describe('AppointmentsService.create', () => {
  beforeEach(() => { mockReset(prisma); mockReset(availability); mockReset(services); });

  it('books an appointment for a logged-in customer', async () => {
    services.findById.mockResolvedValueOnce(service as any);
    availability.getSlots.mockResolvedValueOnce([
      { startAt: '2026-06-01T14:00:00.000Z', localTime: '09:00' },
    ]);
    (prisma.appointment as any).create.mockResolvedValueOnce({
      id: 'ap1', customerId: 'u1', guestEmail: null, guestPhone: null, guestFullName: null,
      specialistId: 's1', serviceId: 'svc1',
      scheduledAt: new Date('2026-06-01T14:00:00.000Z'),
      durationMinutes: 45, status: 'scheduled', notes: null,
      createdAt: new Date(),
      specialist: { user: { fullName: 'Spec' } },
      service: { name: 'Cejas' },
    });

    const out = await svc.create({ userId: 'u1' }, {
      serviceId: 'svc1', specialistId: 's1', startAt: '2026-06-01T14:00:00.000Z',
    });
    expect(out.status).toBe('scheduled');
    expect(out.durationMinutes).toBe(45);
  });

  it('rejects when slot is not in the available list (race-aware re-check)', async () => {
    services.findById.mockResolvedValueOnce(service as any);
    availability.getSlots.mockResolvedValueOnce([
      { startAt: '2026-06-01T14:30:00.000Z', localTime: '09:30' },
    ]);
    await expect(svc.create({ userId: 'u1' }, {
      serviceId: 'svc1', specialistId: 's1', startAt: '2026-06-01T14:00:00.000Z',
    })).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: 'SLOT_TAKEN' }),
    });
  });

  it('translates unique-constraint race to 409 SLOT_TAKEN', async () => {
    services.findById.mockResolvedValueOnce(service as any);
    availability.getSlots.mockResolvedValueOnce([
      { startAt: '2026-06-01T14:00:00.000Z', localTime: '09:00' },
    ]);
    (prisma.appointment as any).create.mockRejectedValueOnce(
      Object.assign(new Error(), { code: 'P2002' }),
    );
    await expect(svc.create({ userId: 'u1' }, {
      serviceId: 'svc1', specialistId: 's1', startAt: '2026-06-01T14:00:00.000Z',
    })).rejects.toMatchObject({ status: 409 });
  });

  it('guest booking requires email + phone + name', async () => {
    services.findById.mockResolvedValueOnce(service as any);
    availability.getSlots.mockResolvedValueOnce([
      { startAt: '2026-06-01T14:00:00.000Z', localTime: '09:00' },
    ]);
    await expect(svc.create({ userId: null }, {
      serviceId: 'svc1', specialistId: 's1', startAt: '2026-06-01T14:00:00.000Z',
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
```

- [x] **Step 3: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- appointments.service.spec`.

- [x] **Step 4: Implement `appointments.service.ts`**

```ts
import {
  BadRequestException, ForbiddenException, HttpException, HttpStatus,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { ServicesService } from '../services/services.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import type { AuthUser } from '../../common/types/auth-user';

const INCLUDE = {
  specialist: { include: { user: { select: { fullName: true } } } },
  service: { select: { name: true } },
};

function shape(a: any) {
  return {
    id: a.id,
    customerId: a.customerId,
    guestEmail: a.guestEmail,
    guestPhone: a.guestPhone,
    guestFullName: a.guestFullName,
    specialistId: a.specialistId,
    specialistName: a.specialist?.user?.fullName ?? '',
    serviceId: a.serviceId,
    serviceName: a.service?.name ?? '',
    scheduledAt: a.scheduledAt instanceof Date ? a.scheduledAt.toISOString() : a.scheduledAt,
    durationMinutes: a.durationMinutes,
    status: a.status,
    notes: a.notes,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  };
}

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private availability: AvailabilityService,
    private services: ServicesService,
  ) {}

  async create(actor: { userId: string | null }, dto: CreateAppointmentDto) {
    const service = await this.services.findById(dto.serviceId);

    if (!actor.userId) {
      if (!dto.guestEmail || !dto.guestPhone || !dto.guestFullName) {
        throw new BadRequestException('guestEmail, guestPhone, guestFullName required');
      }
    }

    // Re-check availability at booking time. Race with the unique constraint catches the rest.
    const dateYmd = dto.startAt.slice(0, 10);
    const slots = await this.availability.getSlots({
      serviceId: dto.serviceId,
      specialistId: dto.specialistId,
      date: dateYmd,
    });
    const wanted = new Date(dto.startAt).toISOString();
    const isFree = slots.some((s) => s.startAt === wanted);
    if (!isFree) {
      throw new HttpException(
        { code: 'SLOT_TAKEN', message: 'That slot is no longer available' },
        HttpStatus.CONFLICT,
      );
    }

    try {
      const row = await this.prisma.appointment.create({
        data: {
          customerId: actor.userId,
          guestEmail: actor.userId ? null : dto.guestEmail!,
          guestPhone: actor.userId ? null : dto.guestPhone!,
          guestFullName: actor.userId ? null : dto.guestFullName!,
          specialistId: dto.specialistId,
          serviceId: dto.serviceId,
          scheduledAt: new Date(dto.startAt),
          durationMinutes: service.durationMinutes,
          status: 'scheduled',
          notes: dto.notes,
        },
        include: INCLUDE,
      });
      return shape(row);
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new HttpException(
          { code: 'SLOT_TAKEN', message: 'That slot was just booked' },
          HttpStatus.CONFLICT,
        );
      }
      throw e;
    }
  }
}
```

- [x] **Step 5: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- appointments.service.spec`. Expected: 4 passing.

- [x] **Step 6: Commit**

```bash
git add apps/api/src/modules/appointments
git commit -m "feat(api): AppointmentsService.create with race-protected booking"
```

---

## Task 9: AppointmentsService — list, cancel, status transitions (TDD)

**Files:**
- Modify: `apps/api/src/modules/appointments/appointments.service.ts`
- Modify: `apps/api/src/modules/appointments/appointments.service.spec.ts`
- Create: `apps/api/src/modules/appointments/dto/update-appointment-status.dto.ts`

- [x] **Step 1: Write DTO**

```ts
import { IsEnum } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus) status!: AppointmentStatus;
}
```

- [x] **Step 2: Append failing tests**

```ts
describe('AppointmentsService.cancelByCustomer', () => {
  beforeEach(() => { mockReset(prisma); mockReset(availability); mockReset(services); });

  it('allows cancel when more than 24h ahead', async () => {
    const ts = new Date(Date.now() + 30 * 60 * 60 * 1000); // 30h ahead
    (prisma.appointment as any).findUnique.mockResolvedValueOnce({
      id: 'ap1', customerId: 'u1', status: 'scheduled', scheduledAt: ts,
      specialist: { user: { fullName: 'Spec' } }, service: { name: 'Cejas' },
      durationMinutes: 45, guestEmail: null, guestPhone: null, guestFullName: null,
      serviceId: 'svc1', specialistId: 's1', notes: null, createdAt: new Date(),
    });
    (prisma.appointment as any).update.mockResolvedValueOnce({
      id: 'ap1', status: 'cancelled', scheduledAt: ts, durationMinutes: 45,
      customerId: 'u1', guestEmail: null, guestPhone: null, guestFullName: null,
      serviceId: 'svc1', specialistId: 's1', notes: null, createdAt: new Date(),
      specialist: { user: { fullName: 'Spec' } }, service: { name: 'Cejas' },
    });
    const out = await svc.cancelByCustomer('u1', 'ap1');
    expect(out.status).toBe('cancelled');
  });

  it('rejects cancel within 24h with CANCELLATION_DEADLINE_PASSED', async () => {
    const ts = new Date(Date.now() + 10 * 60 * 60 * 1000); // 10h ahead
    (prisma.appointment as any).findUnique.mockResolvedValueOnce({
      id: 'ap1', customerId: 'u1', status: 'scheduled', scheduledAt: ts,
      durationMinutes: 45,
    });
    await expect(svc.cancelByCustomer('u1', 'ap1')).rejects.toMatchObject({
      status: 400,
      response: expect.objectContaining({ code: 'CANCELLATION_DEADLINE_PASSED' }),
    });
  });

  it('rejects when not the owner', async () => {
    (prisma.appointment as any).findUnique.mockResolvedValueOnce({
      id: 'ap1', customerId: 'u2', status: 'scheduled',
      scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
    });
    await expect(svc.cancelByCustomer('u1', 'ap1')).rejects.toMatchObject({ status: 403 });
  });
});

describe('AppointmentsService.adminUpdateStatus', () => {
  beforeEach(() => mockReset(prisma));

  const baseRow = (status: AppointmentStatus) => ({
    id: 'ap1', status, scheduledAt: new Date(), durationMinutes: 45,
    customerId: null, guestEmail: null, guestPhone: null, guestFullName: null,
    serviceId: 'svc1', specialistId: 's1', notes: null, createdAt: new Date(),
    specialist: { user: { fullName: 'Spec' } }, service: { name: 'Cejas' },
  });

  it('allows scheduled → completed', async () => {
    (prisma.appointment as any).findUnique.mockResolvedValueOnce(baseRow('scheduled'));
    (prisma.appointment as any).update.mockResolvedValueOnce(baseRow('completed'));
    const out = await svc.adminUpdateStatus('ap1', 'completed' as any);
    expect(out.status).toBe('completed');
  });

  it('rejects completed → scheduled', async () => {
    (prisma.appointment as any).findUnique.mockResolvedValueOnce(baseRow('completed'));
    await expect(svc.adminUpdateStatus('ap1', 'scheduled' as any)).rejects.toBeInstanceOf(Error);
  });
});

describe('AppointmentsService.listForUser', () => {
  beforeEach(() => mockReset(prisma));

  it('returns the customer\'s appointments ordered by scheduledAt desc', async () => {
    (prisma.appointment as any).findMany.mockResolvedValueOnce([]);
    await svc.listForUser('u1');
    const call = (prisma.appointment.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ customerId: 'u1' });
    expect(call.orderBy).toEqual({ scheduledAt: 'desc' });
  });
});
```

- [x] **Step 3: Run — expect FAIL**

Run: `pnpm --filter @bymariap/api test -- appointments.service.spec`.

- [x] **Step 4: Extend `appointments.service.ts`**

Add methods inside the class:

```ts
async listForUser(userId: string) {
  const rows = await this.prisma.appointment.findMany({
    where: { customerId: userId },
    include: INCLUDE,
    orderBy: { scheduledAt: 'desc' },
  });
  return rows.map(shape);
}

async listForSpecialist(specialistId: string, fromIso?: string, toIso?: string) {
  const rows = await this.prisma.appointment.findMany({
    where: {
      specialistId,
      ...(fromIso || toIso
        ? { scheduledAt: { gte: fromIso ? new Date(fromIso) : undefined, lt: toIso ? new Date(toIso) : undefined } }
        : {}),
    },
    include: INCLUDE,
    orderBy: { scheduledAt: 'asc' },
  });
  return rows.map(shape);
}

async listAdmin(status?: AppointmentStatus) {
  const rows = await this.prisma.appointment.findMany({
    where: status ? { status } : {},
    include: INCLUDE,
    orderBy: { scheduledAt: 'desc' },
  });
  return rows.map(shape);
}

async findById(id: string, actor: AuthUser) {
  const row = await this.prisma.appointment.findUnique({ where: { id }, include: INCLUDE });
  if (!row) throw new NotFoundException();
  const broad = actor.permissions.includes('appointments:read') || actor.permissions.includes('*');
  if (!broad) {
    const isOwner =
      (actor.role === 'customer' && row.customerId === actor.id) ||
      (actor.role === 'specialist' && row.specialistId === actor.specialistId);
    if (!isOwner) throw new ForbiddenException();
  }
  return shape(row);
}

async cancelByCustomer(userId: string, id: string) {
  const row = await this.prisma.appointment.findUnique({ where: { id } });
  if (!row) throw new NotFoundException();
  if (row.customerId !== userId) throw new ForbiddenException();
  if (row.status !== 'scheduled') throw new BadRequestException('Only scheduled appointments can be cancelled');
  const hoursUntil = (row.scheduledAt.getTime() - Date.now()) / 3600_000;
  if (hoursUntil < 24) {
    throw new HttpException(
      { code: 'CANCELLATION_DEADLINE_PASSED', message: 'Less than 24h before appointment — contact admin' },
      HttpStatus.BAD_REQUEST,
    );
  }
  const updated = await this.prisma.appointment.update({
    where: { id }, data: { status: 'cancelled' }, include: INCLUDE,
  });
  return shape(updated);
}

async adminUpdateStatus(id: string, next: AppointmentStatus) {
  const row = await this.prisma.appointment.findUnique({ where: { id } });
  if (!row) throw new NotFoundException();
  if (!isValidAppointmentTransition(row.status, next)) {
    throw new BadRequestException(`Invalid transition ${row.status} → ${next}`);
  }
  const updated = await this.prisma.appointment.update({
    where: { id }, data: { status: next }, include: INCLUDE,
  });
  return shape(updated);
}
```

Below the class:

```ts
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show:   [],
};
export function isValidAppointmentTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
```

- [x] **Step 5: Run — expect PASS**

Run: `pnpm --filter @bymariap/api test -- appointments.service.spec`. Expected: all green.

- [x] **Step 6: Commit**

```bash
git add apps/api/src/modules/appointments
git commit -m "feat(api): appointment listing + cancel-by-customer (24h rule) + admin status machine"
```

---

## Task 10: AppointmentsController + module

**Files:**
- Create: `apps/api/src/modules/appointments/appointments.controller.ts`
- Create: `apps/api/src/modules/appointments/appointments.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [x] **Step 1: Write controller**

```ts
import {
  BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { AppointmentStatus } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

@Controller()
export class AppointmentsController {
  constructor(private svc: AppointmentsService) {}

  @Public()
  @Post('store/appointments')
  create(@Req() req: Request, @Body() dto: CreateAppointmentDto) {
    const user = (req as any).user as AuthUser | undefined;
    return this.svc.create({ userId: user?.id ?? null }, dto);
  }

  @Get('me/appointments')
  myAppointments(@CurrentUser() user: AuthUser) {
    if (user.role === 'specialist') {
      if (!user.specialistId) throw new BadRequestException();
      return this.svc.listForSpecialist(user.specialistId);
    }
    return this.svc.listForUser(user.id);
  }

  @Post('me/appointments/:id/cancel')
  cancelMine(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (user.role !== 'customer') throw new BadRequestException('Only customers can self-cancel');
    return this.svc.cancelByCustomer(user.id, id);
  }

  @Get('admin/appointments')
  @RequirePermissions('appointments:read')
  list(@Query('status') status?: AppointmentStatus) {
    return this.svc.listAdmin(status);
  }

  @Get('admin/appointments/:id')
  @RequirePermissions('appointments:read')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.findById(id, user);
  }

  @Patch('admin/appointments/:id/status')
  @RequirePermissions('appointments:write')
  setStatus(@Param('id') id: string, @Body() dto: UpdateAppointmentStatusDto) {
    return this.svc.adminUpdateStatus(id, dto.status);
  }
}
```

- [x] **Step 2: Write `appointments.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AvailabilityModule } from '../availability/availability.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [AvailabilityModule, ServicesModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
```

- [x] **Step 3: Register in `apps/api/src/app.module.ts`**

Add `AppointmentsModule` to `imports`.

- [x] **Step 4: Build + commit**

```bash
pnpm --filter @bymariap/api build
git add apps/api/src
git commit -m "feat(api): appointments controller (store + me + admin)"
```

---

## Task 11: Integration E2E test for slot edge cases (real DB)

**Files:**
- Create: `apps/api/test/availability-slots.e2e-spec.ts`

- [x] **Step 1: Write the test**

```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { startTestDb } from './helpers/db';

describe('Availability slots E2E', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let stopDb: () => Promise<void>;
  let specialistId: string;
  let serviceId: string;

  beforeAll(async () => {
    const db = await startTestDb();
    stopDb = db.stop;
    process.env.JWT_ACCESS_SECRET = 'a'; process.env.JWT_REFRESH_SECRET = 'r';
    process.env.SEED_ADMIN_EMAIL = 'admin@bymariap.com';
    process.env.SEED_ADMIN_PASSWORD = 'admin-pass-123';
    execSync('pnpm prisma:seed', { stdio: 'inherit', env: process.env, cwd: __dirname + '/..' });

    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = new PrismaClient();

    // Set up a specialist user + service
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'specialist' } });
    const user = await prisma.user.create({
      data: {
        email: 'spec@bymariap.com',
        passwordHash: '$2b$12$0123456789012345678901C/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        fullName: 'Especialista Test',
        roleId: role.id,
      },
    });
    const spec = await prisma.specialist.create({ data: { userId: user.id } });
    specialistId = spec.id;

    const svc = await prisma.service.create({
      data: { name: 'Cejas', slug: 'cejas', durationMinutes: 45, priceCop: 50000, status: 'published' },
    });
    serviceId = svc.id;

    // Availability: morning 09:00-12:00, afternoon 14:00-18:00 on 2026-06-01 (Bogota date)
    await prisma.specialistAvailability.createMany({
      data: [
        { specialistId, date: new Date('2026-06-01T00:00:00.000Z'), startMinute: 540, endMinute: 720 },
        { specialistId, date: new Date('2026-06-01T00:00:00.000Z'), startMinute: 840, endMinute: 1080 },
      ],
    });
  }, 240_000);

  afterAll(async () => { await prisma.$disconnect(); await app.close(); await stopDb(); });

  it('returns 09:00, 09:30, 10:00, 10:30, 11:00 + afternoon slots when day is empty', async () => {
    const res = await request(app.getHttpServer())
      .get(`/store/availability?serviceId=${serviceId}&specialistId=${specialistId}&date=2026-06-01`)
      .expect(200);
    const local = (res.body as { localTime: string }[]).map((s) => s.localTime);
    expect(local).toEqual([
      '09:00', '09:30', '10:00', '10:30', '11:00',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
    ]);
  });

  it('after booking 10:00, that slot and overlapping 09:30 / 10:30 disappear', async () => {
    // Book 10:00 Bogota = 15:00 UTC
    await prisma.appointment.create({
      data: {
        customerId: null, guestEmail: 'g@g.c', guestPhone: '3001112222', guestFullName: 'Guest',
        specialistId, serviceId,
        scheduledAt: new Date('2026-06-01T15:00:00.000Z'),
        durationMinutes: 45, status: 'scheduled',
      },
    });

    const res = await request(app.getHttpServer())
      .get(`/store/availability?serviceId=${serviceId}&specialistId=${specialistId}&date=2026-06-01`)
      .expect(200);
    const local = (res.body as { localTime: string }[]).map((s) => s.localTime);
    expect(local).not.toContain('09:30');
    expect(local).not.toContain('10:00');
    expect(local).not.toContain('10:30');
    expect(local).toContain('09:00');
    expect(local).toContain('11:00');
  });

  it('day with no availability returns []', async () => {
    const res = await request(app.getHttpServer())
      .get(`/store/availability?serviceId=${serviceId}&specialistId=${specialistId}&date=2026-06-02`)
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it('POST /store/appointments succeeds, second one to same slot is 409 SLOT_TAKEN', async () => {
    const startAt = new Date('2026-06-01T19:00:00.000Z').toISOString(); // 14:00 Bogota
    const payload = {
      serviceId, specialistId, startAt,
      guestEmail: 'a@b.c', guestPhone: '3001112222', guestFullName: 'A',
    };
    await request(app.getHttpServer()).post('/store/appointments').send(payload).expect(201);
    const second = await request(app.getHttpServer()).post('/store/appointments').send(payload).expect(409);
    expect(second.body.code).toBe('SLOT_TAKEN');
  });
});
```

- [x] **Step 2: Run**

Run: `pnpm --filter @bymariap/api test:e2e -- availability-slots`. Requires Docker.

Expected: 4 passing.

- [x] **Step 3: Commit**

```bash
git add apps/api/test/availability-slots.e2e-spec.ts
git commit -m "test(api): availability slots e2e — grid + busy exclusion + SLOT_TAKEN race"
```

---

## Task 12: Seed default service

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [x] **Step 1: Append**

Before `console.log('seed: ok')`:

```ts
await prisma.service.upsert({
  where: { slug: 'diseno-cejas' },
  update: {},
  create: {
    name: 'Diseño de Cejas',
    slug: 'diseno-cejas',
    description: 'Diseño profesional de cejas adaptado a tu rostro. Duración aproximada 45 minutos.',
    durationMinutes: 45,
    priceCop: 50000,
    status: 'published',
  },
});
```

- [x] **Step 2: Run seed + commit**

```bash
pnpm --filter @bymariap/api prisma:seed
git add apps/api/prisma/seed.ts
git commit -m "feat(api): seed default service (Diseño de Cejas)"
```

---

## Task 13: Admin — services CRUD page

**Files:**
- Create: `apps/admin/src/features/services/api.ts`
- Create: `apps/admin/src/features/services/services-page.tsx`
- Create: `apps/admin/src/features/services/service-form-dialog.tsx`
- Modify: `apps/admin/src/routes.tsx`
- Modify: `apps/admin/src/components/app-shell.tsx`

- [x] **Step 1: `features/services/api.ts`**

```ts
import { api } from '@/lib/api';
import type { ServiceDTO } from '@bymariap/types';

export interface ServiceInput {
  name: string; slug: string; description?: string;
  durationMinutes: number; priceCop: number; status: 'draft' | 'published' | 'archived';
}

export const servicesApi = {
  list:   () => api.get<ServiceDTO[]>('/admin/services'),
  get:    (id: string) => api.get<ServiceDTO>(`/admin/services/${id}`),
  create: (data: ServiceInput) => api.post<ServiceDTO>('/admin/services', data),
  update: (id: string, data: Partial<ServiceInput>) => api.patch<ServiceDTO>(`/admin/services/${id}`, data),
  remove: (id: string) => api.delete(`/admin/services/${id}`),
};
```

- [x] **Step 2: `service-form-dialog.tsx`** (mirrors `category-form-dialog.tsx` shape — adapt for service fields)

Build the form with react-hook-form + zod (`name`, `slug`, `description`, `durationMinutes`, `priceCop`, `status`). Use the existing admin primitives (`Dialog`, `Input`, `Label`, `Textarea`, `Select`, `Button`). Wire `useMutation` with `useQueryClient` to invalidate `['services']` on success.

- [x] **Step 3: `services-page.tsx`** (mirrors `categories-page.tsx` — table with list + create / edit / delete actions). Show columns: Nombre, Duración (min), Precio (COP), Estado, acciones.

- [x] **Step 4: Register route**

In `apps/admin/src/routes.tsx`, add inside the `AppShell` children:
```tsx
{ path: '/services', element: <ServicesPage /> },
```

In `apps/admin/src/components/app-shell.tsx`, add to `nav`:
```ts
{ to: '/services', label: 'Servicios' },
```

- [x] **Step 5: Build, commit**

```bash
pnpm --filter @bymariap/admin build
git add apps/admin/src
git commit -m "feat(admin): services CRUD page"
```

---

## Task 14: Admin — availability page (specialist publishes own windows)

**Files:**
- Create: `apps/admin/src/features/availability/api.ts`
- Create: `apps/admin/src/features/availability/availability-page.tsx`
- Create: `apps/admin/src/features/availability/availability-window-dialog.tsx`
- Modify: `apps/admin/src/routes.tsx`
- Modify: `apps/admin/src/components/app-shell.tsx`

- [x] **Step 1: `features/availability/api.ts`**

```ts
import { api } from '@/lib/api';
import type { AvailabilityWindowDTO } from '@bymariap/types';

export const availabilityApi = {
  listMine: (fromDate: string, toDate: string) =>
    api.get<AvailabilityWindowDTO[]>(`/me/availability?fromDate=${fromDate}&toDate=${toDate}`),
  publish: (data: { date: string; startMinute: number; endMinute: number }) =>
    api.post<AvailabilityWindowDTO>('/me/availability', data),
  remove: (id: string) => api.delete(`/me/availability/${id}`),
};
```

- [x] **Step 2: `availability-window-dialog.tsx`**

Dialog form with three inputs: `date` (HTML `<input type="date">`), `startTime` (`<input type="time">`), `endTime`. On submit, convert times to minutes and call `availabilityApi.publish`. Validate `endMinute > startMinute`.

Time-to-minutes helper:
```ts
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
export function minutesToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
```

- [x] **Step 3: `availability-page.tsx`**

Layout: top filter (from / to date inputs, default this week), button "Publicar disponibilidad" opens the dialog, table with rows grouped by date showing the windows; each row has a "Eliminar" action.

Uses `useMe()` to check `user.role === 'specialist'`. If not, render: "Esta sección es solo para especialistas."

- [x] **Step 4: Register route + nav**

In `routes.tsx`:
```tsx
{ path: '/mi-agenda', element: <AvailabilityPage /> },
```
In `app-shell.tsx` add:
```ts
{ to: '/mi-agenda', label: 'Mi agenda' },
```

- [x] **Step 5: Build, commit**

```bash
pnpm --filter @bymariap/admin build
git add apps/admin/src
git commit -m "feat(admin): specialist availability publishing page"
```

---

## Task 15: Admin — appointments page

**Files:**
- Create: `apps/admin/src/features/appointments/api.ts`
- Create: `apps/admin/src/features/appointments/appointments-page.tsx`
- Modify: `apps/admin/src/routes.tsx`
- Modify: `apps/admin/src/components/app-shell.tsx`

- [x] **Step 1: `features/appointments/api.ts`**

```ts
import { api } from '@/lib/api';
import type { AppointmentDTO, AppointmentStatus } from '@bymariap/types';

export const appointmentsApi = {
  list: (status?: AppointmentStatus) =>
    api.get<AppointmentDTO[]>(`/admin/appointments${status ? `?status=${status}` : ''}`),
  setStatus: (id: string, status: AppointmentStatus) =>
    api.patch<AppointmentDTO>(`/admin/appointments/${id}/status`, { status }),
  mine: () => api.get<AppointmentDTO[]>('/me/appointments'),
};
```

- [x] **Step 2: `appointments-page.tsx`**

Layout: status filter (todos / scheduled / completed / cancelled / no_show). Table columns: Fecha, Hora, Cliente, Servicio, Especialista, Estado, acciones.

Date formatting uses `Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' })`.

Actions per row, only when `status === 'scheduled'`:
- Marcar completada → `setStatus(id, 'completed')`
- Marcar no_show → `setStatus(id, 'no_show')`
- Cancelar → `setStatus(id, 'cancelled')`

- [x] **Step 3: Register route + nav**

In `routes.tsx`:
```tsx
{ path: '/citas', element: <AppointmentsPage /> },
```
In `app-shell.tsx` add:
```ts
{ to: '/citas', label: 'Citas' },
```

- [x] **Step 4: Build, commit**

```bash
pnpm --filter @bymariap/admin build
git add apps/admin/src
git commit -m "feat(admin): appointments list with status transitions"
```

---

## Task 16: Storefront — services listing + booking page

**Files:**
- Create: `apps/storefront/src/app/servicios/page.tsx`
- Create: `apps/storefront/src/app/servicios/[slug]/page.tsx`
- Create: `apps/storefront/src/components/service-card.tsx`
- Create: `apps/storefront/src/components/date-slot-picker.tsx`
- Create: `apps/storefront/src/lib/booking/api.ts`
- Modify: `apps/storefront/src/components/header.tsx` (add nav link)

- [x] **Step 1: Check Stitch for booking screens**

Call `mcp__stitch__list_screens` and `mcp__stitch__get_screen` for any screen related to services / booking / appointments / calendar / cita. If a screen exists, mirror it 1:1. If not, use the existing storefront tokens to derive a consistent design.

- [x] **Step 2: `lib/booking/api.ts`** (client)

```ts
'use client';

import { api } from '@/lib/api/client';
import type { AppointmentDTO, AvailableSlotDTO, ServiceDTO } from '@bymariap/types';

export const bookingApi = {
  services: () => fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/store/services`).then((r) => r.json()) as Promise<ServiceDTO[]>,
  serviceBySlug: (slug: string) => fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/store/services/${slug}`).then((r) => r.json()) as Promise<ServiceDTO>,
  slots: (serviceId: string, specialistId: string, date: string) =>
    api.get<AvailableSlotDTO[]>(`/store/availability?serviceId=${serviceId}&specialistId=${specialistId}&date=${date}`),
  book: (input: {
    serviceId: string; specialistId: string; startAt: string;
    guestEmail?: string; guestPhone?: string; guestFullName?: string; notes?: string;
  }) => api.post<AppointmentDTO>('/store/appointments', input),
  specialists: () =>
    api.get<{ id: string; userId: string; user: { fullName: string }; specialties: string[] }[]>('/admin/specialists'),
};
```

> Note: `/admin/specialists` requires admin permissions. For MVP the storefront needs a **public** list of specialists. Defer this to a backend addition done inline: if not yet present, add a `GET /store/specialists` endpoint in the SpecialistsController (returns id + display name + specialties only). Adding it is small and stays within Phase 5 scope.

- [x] **Step 3: Add `GET /store/specialists` to API**

In `apps/api/src/modules/specialists/specialists.controller.ts`, add at the top of the class:

```ts
@Public()
@Get('/store/specialists')
publicList() {
  return this.svc.findAll().then((rows) => rows.map((s) => ({
    id: s.id, userId: s.userId, user: { fullName: s.user.fullName },
    specialties: s.specialties, avatarUrl: s.avatarUrl,
  })));
}
```

Move the controller's `@Controller('admin/specialists')` decorator to `@Controller()` and prefix each existing route with `admin/specialists` so that the new `@Public() @Get('/store/specialists')` coexists:

```ts
@Controller()
@RequirePermissions('users:write')   // class-level permission still applies to all routes by default
export class SpecialistsController {
  constructor(private svc: SpecialistsService) {}

  @Public()
  @Get('store/specialists')
  publicList() { /* … */ }

  @Get('admin/specialists')                  list() { return this.svc.findAll(); }
  @Get('admin/specialists/:userId')          get(@Param('userId') id: string) { return this.svc.findByUserId(id); }
  @Put('admin/specialists/:userId')          upsert(@Param('userId') id: string, @Body() dto: UpsertSpecialistDto) { return this.svc.upsert(id, dto); }
  @Delete('admin/specialists/:userId')       remove(@Param('userId') id: string) { return this.svc.remove(id); }
}
```

> Class-level `@RequirePermissions` plus method-level `@Public()` — the `JwtAuthGuard` short-circuits public routes, and `PermissionsGuard` only enforces when permissions are required and the route is not public. Verify with the existing guard test suite by running `pnpm --filter @bymariap/api test -- guards`.

Build the API: `pnpm --filter @bymariap/api build`.

Update the storefront `bookingApi.specialists` call to hit `/store/specialists`.

- [x] **Step 4: `components/service-card.tsx`**

```tsx
import Link from 'next/link';
import type { ServiceDTO } from '@bymariap/types';
import { formatCop } from '@/lib/format';

export function ServiceCard({ service }: { service: ServiceDTO }) {
  return (
    <Link href={`/servicios/${service.slug}`} className="block rounded-lg border border-border p-6 hover:shadow-md transition">
      <h3 className="text-xl font-heading">{service.name}</h3>
      <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{service.description}</p>
      <div className="mt-4 flex justify-between text-sm">
        <span>{service.durationMinutes} min</span>
        <span className="font-medium">{formatCop(service.priceCop)}</span>
      </div>
    </Link>
  );
}
```

- [x] **Step 5: `app/servicios/page.tsx`** (server component, ISR)

```tsx
import { serverFetch } from '@/lib/api/server';
import { endpoints } from '@/lib/api/endpoints';
import { ServiceCard } from '@/components/service-card';
import type { ServiceDTO } from '@bymariap/types';

export const revalidate = 60;
export const metadata = { title: 'Servicios' };

export default async function ServicesPage() {
  const services = await serverFetch<ServiceDTO[]>('/store/services', { next: { revalidate: 60 } });
  return (
    <div className="container py-10 space-y-8">
      <header>
        <h1 className="text-4xl font-heading">Servicios</h1>
        <p className="text-muted-foreground mt-2">Agenda con un especialista.</p>
      </header>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((s) => <ServiceCard key={s.id} service={s} />)}
      </div>
    </div>
  );
}
```

(Also add `storeServices: '/store/services'`, `storeService: (slug: string) => `/store/services/${slug}`` to `endpoints.ts`.)

- [x] **Step 6: `components/date-slot-picker.tsx`** (client)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookingApi } from '@/lib/booking/api';
import { cn } from '@/lib/cn';

interface Props {
  serviceId: string;
  specialistId: string;
  value: string | null;
  onChange: (startAt: string) => void;
}

export function DateSlotPicker({ serviceId, specialistId, value, onChange }: Props) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const slots = useQuery({
    queryKey: ['slots', serviceId, specialistId, date],
    queryFn: () => bookingApi.slots(serviceId, specialistId, date),
    enabled: Boolean(specialistId),
  });

  useEffect(() => { if (value) onChange(value); }, [serviceId, specialistId]); // reset when service/specialist change

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Fecha</label>
        <input
          type="date" value={date} onChange={(e) => setDate(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          className="h-12 px-3 rounded-md border border-border bg-background"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Horario</label>
        {slots.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {slots.data && slots.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay disponibilidad ese día.</p>
        )}
        {slots.data && slots.data.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {slots.data.map((s) => (
              <button
                key={s.startAt} type="button" onClick={() => onChange(s.startAt)}
                className={cn(
                  'h-11 rounded-md border text-sm',
                  value === s.startAt ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted',
                )}
              >
                {s.localTime}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [x] **Step 7: `app/servicios/[slug]/page.tsx`** (server + embedded client booking form)

```tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { serverFetch, ApiError } from '@/lib/api/server';
import { formatCop } from '@/lib/format';
import { BookingForm } from './booking-form';
import type { ServiceDTO } from '@bymariap/types';

export const revalidate = 60;

interface Props { params: Promise<{ slug: string }>; }

async function fetchService(slug: string): Promise<ServiceDTO | null> {
  try { return await serverFetch<ServiceDTO>(`/store/services/${slug}`, { next: { revalidate: 60 } }); }
  catch (e) { if (e instanceof ApiError && e.status === 404) return null; throw e; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await fetchService(slug);
  return s ? { title: s.name, description: s.description ?? undefined } : { title: 'Servicio no encontrado' };
}

export default async function ServiceDetail({ params }: Props) {
  const { slug } = await params;
  const service = await fetchService(slug);
  if (!service) notFound();

  return (
    <div className="container py-10 grid md:grid-cols-2 gap-10">
      <section className="space-y-4">
        <h1 className="text-4xl font-heading">{service.name}</h1>
        <p className="text-2xl">{formatCop(service.priceCop)}</p>
        <p className="text-sm text-muted-foreground">{service.durationMinutes} minutos</p>
        {service.description && <p className="text-muted-foreground whitespace-pre-line">{service.description}</p>}
      </section>
      <section>
        <BookingForm service={service} />
      </section>
    </div>
  );
}
```

`app/servicios/[slug]/booking-form.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { useMe } from '@/lib/auth/hooks';
import { bookingApi } from '@/lib/booking/api';
import { DateSlotPicker } from '@/components/date-slot-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ServiceDTO } from '@bymariap/types';

interface FormValues { specialistId: string; guestEmail: string; guestPhone: string; guestFullName: string; notes: string; }

export function BookingForm({ service }: { service: ServiceDTO }) {
  const me = useMe();
  const router = useRouter();
  const [startAt, setStartAt] = useState<string | null>(null);
  const specialists = useQuery({ queryKey: ['public-specialists'], queryFn: bookingApi.specialists });
  const form = useForm<FormValues>({
    defaultValues: { specialistId: '', guestEmail: '', guestPhone: '', guestFullName: '', notes: '' },
  });

  async function onSubmit(v: FormValues) {
    if (!startAt) return toast.error('Selecciona un horario');
    try {
      const ap = await bookingApi.book({
        serviceId: service.id,
        specialistId: v.specialistId,
        startAt,
        guestEmail: me.data ? undefined : v.guestEmail,
        guestPhone: me.data ? undefined : v.guestPhone,
        guestFullName: me.data ? undefined : v.guestFullName,
        notes: v.notes || undefined,
      });
      toast.success('Cita agendada');
      router.push(`/mi-cuenta/citas`);
    } catch (e: any) {
      if (e?.body?.code === 'SLOT_TAKEN') toast.error('Ese horario acaba de ser tomado, elige otro.');
      else toast.error(e?.message ?? 'No se pudo agendar');
    }
  }

  const specialistId = form.watch('specialistId');

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 border border-border rounded-lg p-6">
      <h2 className="text-xl font-heading">Agenda tu cita</h2>

      <div className="space-y-1">
        <Label>Especialista</Label>
        <Select {...form.register('specialistId')}>
          <option value="">—</option>
          {specialists.data?.map((s) => (
            <option key={s.id} value={s.id}>{s.user.fullName}</option>
          ))}
        </Select>
      </div>

      {specialistId && (
        <DateSlotPicker
          serviceId={service.id}
          specialistId={specialistId}
          value={startAt}
          onChange={setStartAt}
        />
      )}

      {!me.data && (
        <div className="space-y-3">
          <div className="space-y-1"><Label>Nombre</Label><Input {...form.register('guestFullName')} required /></div>
          <div className="space-y-1"><Label>Email</Label><Input type="email" {...form.register('guestEmail')} required /></div>
          <div className="space-y-1"><Label>Teléfono</Label><Input {...form.register('guestPhone')} required /></div>
        </div>
      )}

      <div className="space-y-1"><Label>Notas (opcional)</Label><Textarea {...form.register('notes')} /></div>

      <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting || !startAt}>
        Agendar cita
      </Button>
      <p className="text-xs text-muted-foreground text-center">El pago se realiza en sitio.</p>
    </form>
  );
}
```

- [x] **Step 8: Add nav link in `header.tsx`**

Add `<Link href="/servicios">Servicios</Link>` to the nav.

- [x] **Step 9: Commit**

```bash
git add apps/storefront/src apps/api/src
git commit -m "feat(storefront,api): services list + booking page + public specialists endpoint"
```

---

## Task 17: Storefront — `/mi-cuenta/citas`

**Files:**
- Create: `apps/storefront/src/app/mi-cuenta/citas/page.tsx`
- Create: `apps/storefront/src/components/appointment-status-pill.tsx`

- [x] **Step 1: Check Stitch for a screen**

Same drill: `mcp__stitch__get_screen` for any "my appointments" / "mis citas" screen. Mirror if present.

- [x] **Step 2: `appointment-status-pill.tsx`**

```tsx
import { cn } from '@/lib/cn';
import type { AppointmentStatus } from '@bymariap/types';

const styles: Record<AppointmentStatus, { label: string; className: string }> = {
  scheduled: { label: 'Agendada',  className: 'bg-primary text-primary-foreground' },
  completed: { label: 'Completada', className: 'bg-muted text-foreground' },
  cancelled: { label: 'Cancelada', className: 'bg-destructive text-destructive-foreground' },
  no_show:   { label: 'No asistió', className: 'bg-destructive text-destructive-foreground' },
};

export function AppointmentStatusPill({ status }: { status: AppointmentStatus }) {
  const s = styles[status];
  return <span className={cn('inline-block rounded-full px-3 py-1 text-xs', s.className)}>{s.label}</span>;
}
```

- [x] **Step 3: `app/mi-cuenta/citas/page.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { useMe } from '@/lib/auth/hooks';
import { Button } from '@/components/ui/button';
import { AppointmentStatusPill } from '@/components/appointment-status-pill';
import type { AppointmentDTO } from '@bymariap/types';

export default function MyAppointments() {
  const me = useMe();
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (!me.isLoading && !me.data) router.replace('/login?next=/mi-cuenta/citas');
  }, [me.isLoading, me.data, router]);

  const list = useQuery({
    queryKey: ['me-appointments'],
    queryFn: () => api.get<AppointmentDTO[]>('/me/appointments'),
    enabled: Boolean(me.data),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.post<AppointmentDTO>(`/me/appointments/${id}/cancel`),
    onSuccess: () => { toast.success('Cita cancelada'); qc.invalidateQueries({ queryKey: ['me-appointments'] }); },
    onError: (e: any) => {
      if (e?.body?.code === 'CANCELLATION_DEADLINE_PASSED') {
        toast.error('Solo puedes cancelar hasta 24h antes. Contáctanos para cancelar.');
      } else toast.error(e?.message ?? 'No se pudo cancelar');
    },
  });

  if (!list.data) return <div className="container py-10">Cargando…</div>;

  if (list.data.length === 0) {
    return (
      <div className="container py-10 max-w-3xl">
        <h1 className="text-3xl font-heading mb-4">Mis citas</h1>
        <p className="text-muted-foreground">No tienes citas agendadas.</p>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-3xl space-y-4">
      <h1 className="text-3xl font-heading">Mis citas</h1>
      <ul className="space-y-3">
        {list.data.map((a) => {
          const ts = new Date(a.scheduledAt);
          const local = ts.toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'long', timeStyle: 'short' });
          const canCancel = a.status === 'scheduled' && (ts.getTime() - Date.now()) > 24 * 3600 * 1000;
          return (
            <li key={a.id} className="border border-border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="font-medium">{a.serviceName}</p>
                <p className="text-sm text-muted-foreground">{local} · {a.specialistName}</p>
              </div>
              <div className="flex items-center gap-3">
                <AppointmentStatusPill status={a.status} />
                {canCancel && (
                  <Button variant="outline" size="sm" onClick={() => cancel.mutate(a.id)} disabled={cancel.isPending}>
                    Cancelar
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

Add a link to it from `mi-cuenta/page.tsx`:
```tsx
<Link href="/mi-cuenta/citas" className="inline-flex h-11 px-5 items-center justify-center rounded-md border border-border">Mis citas</Link>
```

- [x] **Step 4: Commit**

```bash
git add apps/storefront/src
git commit -m "feat(storefront): my appointments page with 24h cancel rule"
```

---

## Task 18: Manual smoke test

- [x] **Step 1: Bring everything up**

```bash
pnpm --filter @bymariap/api dev
pnpm --filter @bymariap/admin dev
pnpm --filter @bymariap/storefront dev
```

Ensure `SEED_DEMO_DATA=true pnpm --filter @bymariap/api prisma:seed` ran. Ensure there's a `specialist` user (create one from `/users` in the admin if needed) and they have a Specialist profile via `/specialists`.

- [x] **Step 2: Walk through (admin)**

1. Login as the specialist user → "Mi agenda" → publish a window for tomorrow 09:00-12:00 → row appears.
2. Login as admin → "Servicios" → confirm "Diseño de Cejas" is there; create a new test service.
3. "Citas" → empty list.

- [x] **Step 3: Walk through (storefront)**

4. `/servicios` lists the seeded service.
5. Click → service detail loads → select the specialist → date picker shows tomorrow.
6. Slot picker renders `09:00 .. 11:00` (5 slots for 45min service in 3-hour window).
7. Select 10:00, fill guest fields, "Agendar" → success toast → redirect to `/mi-cuenta/citas` (will bounce to `/login` if not logged in — log in first as a `customer` and retry).
8. Logged in: book → appointment appears on `/mi-cuenta/citas`.
9. Refresh `/servicios/diseno-cejas` slot picker → `10:00` is gone, `09:30` and `10:30` also gone (overlap).
10. From the admin `/citas` tab → appointment is visible, click "Marcar completada" → status updates.
11. Try to book the same exact slot from two browser windows simultaneously → second one shows toast "ese horario acaba de ser tomado".
12. From `/mi-cuenta/citas`, try cancelling an appointment more than 24h away → success. Try cancelling one less than 24h away (set the date in admin DB if needed) → friendly error.

- [x] **Step 4: Commit any fixes**

```bash
git add -p
git commit -m "fix(phase5): smoke test fixes"
```

---

## Task 19: README + final verification

**Files:**
- Modify: `README.md`

- [x] **Step 1: Append a Phase 5 section**

```markdown
## Phase 5 — Services, Availability, Appointments

New API surface:
- Public: `GET /store/services`, `/store/services/:slug`, `/store/specialists`, `/store/availability?serviceId&specialistId&date`
- Customer/specialist: `POST /store/appointments`, `GET /me/appointments`, `POST /me/appointments/:id/cancel`, `POST /me/availability`, `GET /me/availability`, `DELETE /me/availability/:id`
- Admin: `GET /admin/services`, `/admin/services/:id`, `POST/PATCH/DELETE /admin/services...`, `GET /admin/appointments`, `PATCH /admin/appointments/:id/status`, `GET /admin/availability?specialistId&fromDate&toDate`

Slot grid is fixed at `:00`/`:30` local America/Bogota; busy intervals come from `scheduled` appointments. Cancellation by customer is allowed up to 24h before `scheduledAt`.

Run E2E (requires Docker):
```bash
pnpm --filter @bymariap/api test:e2e -- availability-slots
```
```

- [x] **Step 2: Verification suite**

```bash
pnpm --filter @bymariap/api typecheck
pnpm --filter @bymariap/api test
pnpm --filter @bymariap/api test:e2e
pnpm --filter @bymariap/api build
pnpm --filter @bymariap/admin typecheck && pnpm --filter @bymariap/admin build
pnpm --filter @bymariap/storefront typecheck && pnpm --filter @bymariap/storefront build
```

Expected: all green.

- [x] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: phase 5 services, availability, appointments"
```

---

## Acceptance criteria (Phase 5)

API:
- `GET /store/services` returns published services only; `GET /store/services/:slug` returns one or 404.
- `GET /store/specialists` is public; returns id + name + specialties.
- `GET /store/availability?serviceId&specialistId&date` returns slots on the `:00`/`:30` grid, every slot's `[start, start+service.duration)` fits inside a published availability window, and no slot overlaps any `scheduled` appointment for that specialist on that local date.
- `POST /store/appointments` works for guests (with email+phone+name) and for logged customers; duplicate exact second → 409 `SLOT_TAKEN`; non-listed slot → 409 `SLOT_TAKEN`.
- `POST /me/appointments/:id/cancel` allowed only by the owning customer, only on `scheduled`, only when ≥ 24h ahead. Otherwise 400 `CANCELLATION_DEADLINE_PASSED`.
- `PATCH /admin/appointments/:id/status` enforces `scheduled → completed | cancelled | no_show` only; other transitions → 400.
- `POST /me/availability` requires `availability:write:own`; rejects when `startMinute ≥ endMinute`.
- Slot generator unit tests (10 cases) + availability E2E (4 cases) green.

Admin:
- `/services` page CRUD works with form validation.
- `/mi-agenda` lets a specialist publish, list, and remove windows for a date range.
- `/citas` lists appointments with status filter and lets admin mark completed / no_show / cancelled.

Storefront:
- `/servicios` lists services.
- `/servicios/[slug]` shows service + specialist selector + date-and-slot picker + booking form (guest fields appear when not logged in).
- Booking shows friendly error on race (`SLOT_TAKEN`) and on validation failure.
- `/mi-cuenta/citas` lists the user's appointments with the 24h-cancel button only when applicable.
- All pages typecheck and build clean.

## Out of scope (deferred)

- Appointment reminders (Phase 6 covers admin WhatsApp-assisted reminders)
- Encrypted client record (Phase 6)
- Payment for appointments
- Recurring availability templates
- Calendar export (.ics)
- Specialist self-management of own profile from admin shell (read-only for now)
- SMS / email confirmations to customers
