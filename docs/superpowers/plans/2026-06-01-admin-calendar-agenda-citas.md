# Admin Calendar (Mi agenda + Citas) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat tables on the admin `Mi agenda` and `Citas` pages with a custom month/week/day calendar, and let an admin manage any specialist's availability.

**Architecture:** A presentation-only `Calendar` component (admin) driven by pure date helpers (`calendar-utils.ts`) built on `date-fns`/`date-fns-tz` anchored to `America/Bogota`. The backend gains admin write routes for availability and a date-range filter for appointments. No changes to slot generation, the storefront, or business flows.

**Tech Stack:** NestJS + Prisma + Jest (backend, already configured). React 18 + Vite + Tailwind + TanStack Query (admin). New: `date-fns` + `date-fns-tz` in the admin, and Vitest for the pure date helpers.

**Prerequisites:** Phase 5 merged. Spec: `docs/superpowers/specs/2026-06-01-admin-calendar-agenda-citas-design.md`.

**Reglas de commits:** NO añadir trailer `Co-Authored-By`.

---

## File Structure

```
apps/api/src/modules/
├── availability/
│   ├── availability.service.ts          # +removeAny()
│   ├── availability.service.spec.ts     # +removeAny tests
│   ├── availability.controller.ts       # +POST/DELETE /admin/availability
│   └── dto/admin-publish-availability.dto.ts   # NEW
├── appointments/
│   ├── appointments.service.ts          # listAdmin(status, from?, to?)
│   ├── appointments.service.spec.ts     # +range tests
│   └── appointments.controller.ts       # GET /admin/appointments?from&to
apps/api/prisma/seed.ts                   # +"availability:write" permission

apps/admin/
├── vitest.config.ts                      # NEW
├── package.json                          # +date-fns, date-fns-tz, vitest
└── src/
    ├── components/calendar/
    │   ├── calendar-utils.ts             # NEW (pure, tested)
    │   ├── calendar-utils.test.ts        # NEW
    │   ├── calendar.tsx                  # NEW (toolbar + view switch)
    │   ├── month-view.tsx                # NEW
    │   ├── week-view.tsx                 # NEW
    │   └── day-view.tsx                  # NEW
    ├── features/availability/
    │   ├── api.ts                        # +admin endpoints
    │   └── availability-page.tsx         # rewritten (calendar + role-aware)
    ├── features/appointments/
    │   ├── api.ts                        # +from/to + specialists
    │   └── appointments-page.tsx         # rewritten (calendar + list toggle)
    └── components/app-shell.tsx          # nav visibility: isAdmin || hasProfile
```

---

## Task 1: Seed `availability:write` permission

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [x] **Step 1: Add the permission to the permissions array**

In `apps/api/prisma/seed.ts`, find the `// availability` block (currently lines ~39-41):

```ts
  // availability
  "availability:read",
  "availability:write:own",
```

Replace it with:

```ts
  // availability
  "availability:read",
  "availability:write",
  "availability:write:own",
```

Do NOT add `availability:write` to the `specialist` role array — only `admin` (which has `*`) should use it.

- [x] **Step 2: Run the seed**

Run: `pnpm --filter @bymariap/api prisma:seed`
Expected: completes without error; the new permission row is upserted.

- [x] **Step 3: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(api): add availability:write permission for admin agenda management"
```

---

## Task 2: `AvailabilityService.removeAny` + admin DTO (TDD)

**Files:**
- Create: `apps/api/src/modules/availability/dto/admin-publish-availability.dto.ts`
- Modify: `apps/api/src/modules/availability/availability.service.ts`
- Modify: `apps/api/src/modules/availability/availability.service.spec.ts`

- [x] **Step 1: Write the admin DTO**

Create `apps/api/src/modules/availability/dto/admin-publish-availability.dto.ts`:

```ts
import { IsDateString, IsInt, IsString, Max, Min } from 'class-validator';

export class AdminPublishAvailabilityDto {
  @IsString() specialistId!: string;
  @IsDateString() date!: string; // YYYY-MM-DD in Bogota tz
  @IsInt() @Min(0) @Max(1440) startMinute!: number;
  @IsInt() @Min(0) @Max(1440) endMinute!: number;
}
```

- [x] **Step 2: Write the failing test for `removeAny`**

In `apps/api/src/modules/availability/availability.service.spec.ts`, add this describe block at the end of the file:

```ts
describe('AvailabilityService.removeAny', () => {
  beforeEach(() => mockReset(prisma));

  it('deletes any window without an ownership check', async () => {
    (prisma.specialistAvailability as any).findUnique.mockResolvedValueOnce({
      id: 'a1', specialistId: 's2',
    });
    (prisma.specialistAvailability as any).delete.mockResolvedValueOnce({ id: 'a1' });
    await svc.removeAny('a1');
    expect(prisma.specialistAvailability.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
  });

  it('throws 404 when the window does not exist', async () => {
    (prisma.specialistAvailability as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.removeAny('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [x] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @bymariap/api test availability.service`
Expected: FAIL — `svc.removeAny is not a function`.

- [x] **Step 4: Implement `removeAny`**

In `apps/api/src/modules/availability/availability.service.ts`, add this method to the class, right after the existing `remove` method:

```ts
async removeAny(id: string) {
  const row = await this.prisma.specialistAvailability.findUnique({ where: { id } });
  if (!row) throw new NotFoundException();
  await this.prisma.specialistAvailability.delete({ where: { id } });
}
```

- [x] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @bymariap/api test availability.service`
Expected: PASS (all availability.service tests green).

- [x] **Step 6: Commit**

```bash
git add apps/api/src/modules/availability
git commit -m "feat(api): AvailabilityService.removeAny + admin publish DTO"
```

---

## Task 3: Admin availability routes (POST/DELETE)

**Files:**
- Modify: `apps/api/src/modules/availability/availability.controller.ts`

- [x] **Step 1: Add the import for the admin DTO**

In `apps/api/src/modules/availability/availability.controller.ts`, add to the imports at the top:

```ts
import { AdminPublishAvailabilityDto } from './dto/admin-publish-availability.dto';
```

- [x] **Step 2: Add the admin write routes**

In the same file, replace the existing `listAny` method (the `@Get('admin/availability')` block) with these three methods:

```ts
  // Admin can read any specialist's windows.
  @Get('admin/availability')
  @RequirePermissions('availability:read')
  listAny(@Query() q: ListAvailabilityQuery) {
    if (!q.specialistId) throw new BadRequestException('specialistId required');
    return this.svc.listForSpecialist(q.specialistId, q.fromDate, q.toDate);
  }

  // Admin can publish a window for any specialist.
  @Post('admin/availability')
  @RequirePermissions('availability:write')
  publishAny(@Body() dto: AdminPublishAvailabilityDto) {
    return this.svc.publish(dto.specialistId, {
      date: dto.date,
      startMinute: dto.startMinute,
      endMinute: dto.endMinute,
    });
  }

  // Admin can delete any window.
  @Delete('admin/availability/:id')
  @RequirePermissions('availability:write')
  removeAny(@Param('id') id: string) {
    return this.svc.removeAny(id);
  }
```

(`Post`, `Delete`, `Param`, `Body` are already imported in this file from Task-5/earlier work — verify the import line `import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';` includes all of them; add any missing.)

- [x] **Step 3: Build**

Run: `pnpm --filter @bymariap/api build`
Expected: builds with no TypeScript errors.

- [x] **Step 4: Commit**

```bash
git add apps/api/src/modules/availability
git commit -m "feat(api): admin availability write routes (publish/delete any specialist)"
```

---

## Task 4: `AppointmentsService.listAdmin` date range (TDD)

**Files:**
- Modify: `apps/api/src/modules/appointments/appointments.service.ts`
- Modify: `apps/api/src/modules/appointments/appointments.service.spec.ts`

- [x] **Step 1: Write the failing tests**

In `apps/api/src/modules/appointments/appointments.service.spec.ts`, add this describe block at the end:

```ts
describe('AppointmentsService.listAdmin range filter', () => {
  beforeEach(() => { mockReset(prisma); mockReset(availability); mockReset(services); });

  it('filters by scheduledAt range when from/to are given', async () => {
    (prisma.appointment as any).findMany.mockResolvedValueOnce([]);
    await svc.listAdmin(undefined, '2026-06-01T00:00:00.000Z', '2026-06-08T00:00:00.000Z');
    const call = (prisma.appointment.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.scheduledAt).toEqual({
      gte: new Date('2026-06-01T00:00:00.000Z'),
      lt: new Date('2026-06-08T00:00:00.000Z'),
    });
  });

  it('combines status and range', async () => {
    (prisma.appointment as any).findMany.mockResolvedValueOnce([]);
    await svc.listAdmin('scheduled' as any, '2026-06-01T00:00:00.000Z', '2026-06-08T00:00:00.000Z');
    const call = (prisma.appointment.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.status).toBe('scheduled');
    expect(call.where.scheduledAt.gte).toEqual(new Date('2026-06-01T00:00:00.000Z'));
  });

  it('no range filter when from/to omitted', async () => {
    (prisma.appointment as any).findMany.mockResolvedValueOnce([]);
    await svc.listAdmin();
    const call = (prisma.appointment.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.scheduledAt).toBeUndefined();
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @bymariap/api test appointments.service`
Expected: FAIL — `listAdmin` ignores extra args, so `where.scheduledAt` is undefined.

- [x] **Step 3: Implement the range filter**

In `apps/api/src/modules/appointments/appointments.service.ts`, replace the existing `listAdmin` method:

```ts
async listAdmin(status?: AppointmentStatus, fromIso?: string, toIso?: string) {
  const where: any = {};
  if (status) where.status = status;
  if (fromIso || toIso) {
    where.scheduledAt = {
      ...(fromIso ? { gte: new Date(fromIso) } : {}),
      ...(toIso ? { lt: new Date(toIso) } : {}),
    };
  }
  const rows = await this.prisma.appointment.findMany({
    where,
    include: INCLUDE,
    orderBy: { scheduledAt: 'desc' },
  });
  return rows.map(shape);
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @bymariap/api test appointments.service`
Expected: PASS (all appointments.service tests green).

- [x] **Step 5: Commit**

```bash
git add apps/api/src/modules/appointments
git commit -m "feat(api): appointments listAdmin supports scheduledAt range filter"
```

---

## Task 5: Appointments controller date-range params

**Files:**
- Modify: `apps/api/src/modules/appointments/appointments.controller.ts`

- [x] **Step 1: Update the admin list route**

In `apps/api/src/modules/appointments/appointments.controller.ts`, replace the existing `list` method (`@Get('admin/appointments')`):

```ts
  @Get('admin/appointments')
  @RequirePermissions('appointments:read')
  list(
    @Query('status') status?: AppointmentStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listAdmin(status, from, to);
  }
```

- [x] **Step 2: Build**

Run: `pnpm --filter @bymariap/api build`
Expected: builds with no TypeScript errors.

- [x] **Step 3: Commit**

```bash
git add apps/api/src/modules/appointments
git commit -m "feat(api): GET /admin/appointments accepts from/to range params"
```

---

## Task 6: Admin tooling — date-fns + Vitest

**Files:**
- Modify: `apps/admin/package.json`
- Create: `apps/admin/vitest.config.ts`

- [x] **Step 1: Install dependencies**

Run:
```bash
pnpm --filter @bymariap/admin add date-fns date-fns-tz
pnpm --filter @bymariap/admin add -D vitest
```

- [x] **Step 2: Add the test script**

In `apps/admin/package.json`, inside `"scripts"`, add:

```json
    "test": "vitest run",
```

- [x] **Step 3: Create `apps/admin/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [x] **Step 4: Verify the runner works (no tests yet)**

Run: `pnpm --filter @bymariap/admin test`
Expected: Vitest runs and reports "No test files found" (exit 0) or passes with 0 tests. This confirms the runner is wired.

- [x] **Step 5: Commit**

```bash
git add apps/admin/package.json apps/admin/vitest.config.ts pnpm-lock.yaml
git commit -m "chore(admin): add date-fns, date-fns-tz and vitest"
```

---

## Task 7: `calendar-utils.ts` — pure date helpers (TDD)

**Files:**
- Create: `apps/admin/src/components/calendar/calendar-utils.ts`
- Create: `apps/admin/src/components/calendar/calendar-utils.test.ts`

- [x] **Step 1: Write the failing tests**

Create `apps/admin/src/components/calendar/calendar-utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  navigate, visibleRange, weekDays, monthGrid, blockPosition, localHHmm,
} from './calendar-utils';

describe('navigate', () => {
  it('month +1 moves to next month', () => {
    expect(navigate('month', new Date('2026-06-15'), 1).getMonth()).toBe(6); // July
  });
  it('week +1 moves 7 days forward', () => {
    const out = navigate('week', new Date('2026-06-01'), 1);
    expect(out.getDate()).toBe(8);
  });
  it('day -1 moves one day back', () => {
    const out = navigate('day', new Date('2026-06-02'), -1);
    expect(out.getDate()).toBe(1);
  });
  it('dir 0 returns today', () => {
    const out = navigate('month', new Date('2020-01-01'), 0);
    expect(out.getFullYear()).toBe(new Date().getFullYear());
  });
});

describe('visibleRange', () => {
  it('week spans Monday..Sunday', () => {
    // 2026-06-03 is a Wednesday
    expect(visibleRange('week', new Date('2026-06-03'))).toEqual({
      from: '2026-06-01', to: '2026-06-07',
    });
  });
  it('day from === to', () => {
    expect(visibleRange('day', new Date('2026-06-03'))).toEqual({
      from: '2026-06-03', to: '2026-06-03',
    });
  });
  it('month covers full weeks around the month', () => {
    const r = visibleRange('month', new Date('2026-06-15'));
    // June 2026 starts Monday Jun 1, ends Tuesday Jun 30 -> grid Jun 1 .. Jul 5
    expect(r.from).toBe('2026-06-01');
    expect(r.to).toBe('2026-07-05');
  });
});

describe('weekDays', () => {
  it('returns 7 days starting Monday', () => {
    const days = weekDays(new Date('2026-06-03'));
    expect(days).toHaveLength(7);
    expect(days[0].getDate()).toBe(1); // Monday Jun 1
    expect(days[6].getDate()).toBe(7); // Sunday Jun 7
  });
});

describe('monthGrid', () => {
  it('returns weeks of 7 days, first cell is a Monday', () => {
    const grid = monthGrid(new Date('2026-06-15'));
    expect(grid[0]).toHaveLength(7);
    expect(grid[0][0].getDate()).toBe(1); // Mon Jun 1
    // flatten contains Jun 15
    const flat = grid.flat().map((d) => d.toISOString().slice(0, 10));
    expect(flat).toContain('2026-06-15');
  });
});

describe('blockPosition', () => {
  it('maps a UTC instant to local Bogota day and minutes', () => {
    // 14:00Z == 09:00 Bogota (UTC-5); 45 min later 14:45Z == 09:45
    const out = blockPosition('2026-06-01T14:00:00.000Z', '2026-06-01T14:45:00.000Z');
    expect(out.dayKey).toBe('2026-06-01');
    expect(out.startMinute).toBe(540);
    expect(out.endMinute).toBe(585);
  });
  it('handles an instant that falls on the previous local day', () => {
    // 02:00Z == 21:00 previous day Bogota
    const out = blockPosition('2026-06-02T02:00:00.000Z', '2026-06-02T02:45:00.000Z');
    expect(out.dayKey).toBe('2026-06-01');
    expect(out.startMinute).toBe(1260); // 21:00
  });
});

describe('localHHmm', () => {
  it('formats a UTC instant as Bogota HH:mm', () => {
    expect(localHHmm('2026-06-01T14:00:00.000Z')).toBe('09:00');
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @bymariap/admin test`
Expected: FAIL — module `./calendar-utils` not found.

- [x] **Step 3: Implement `calendar-utils.ts`**

Create `apps/admin/src/components/calendar/calendar-utils.ts`:

```ts
import { formatInTimeZone } from 'date-fns-tz';
import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format,
  startOfMonth, startOfWeek,
} from 'date-fns';

export const BOGOTA = 'America/Bogota';
export type CalendarView = 'month' | 'week' | 'day';

const WEEK = { weekStartsOn: 1 as const }; // Monday
const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

export function navigate(view: CalendarView, date: Date, dir: -1 | 0 | 1): Date {
  if (dir === 0) return new Date();
  if (view === 'month') return addMonths(date, dir);
  if (view === 'week') return addWeeks(date, dir);
  return addDays(date, dir);
}

export function visibleRange(view: CalendarView, date: Date): { from: string; to: string } {
  if (view === 'month') {
    return {
      from: ymd(startOfWeek(startOfMonth(date), WEEK)),
      to: ymd(endOfWeek(endOfMonth(date), WEEK)),
    };
  }
  if (view === 'week') {
    return { from: ymd(startOfWeek(date, WEEK)), to: ymd(endOfWeek(date, WEEK)) };
  }
  return { from: ymd(date), to: ymd(date) };
}

export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date, WEEK);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthGrid(date: Date): Date[][] {
  const start = startOfWeek(startOfMonth(date), WEEK);
  const end = endOfWeek(endOfMonth(date), WEEK);
  const weeks: Date[][] = [];
  let cursor = start;
  while (cursor <= end) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

function localMinutes(d: Date): number {
  return (
    Number(formatInTimeZone(d, BOGOTA, 'HH')) * 60 +
    Number(formatInTimeZone(d, BOGOTA, 'mm'))
  );
}

export function blockPosition(startUtcIso: string, endUtcIso: string) {
  const s = new Date(startUtcIso);
  const e = new Date(endUtcIso);
  return {
    dayKey: formatInTimeZone(s, BOGOTA, 'yyyy-MM-dd'),
    startMinute: localMinutes(s),
    endMinute: localMinutes(e),
  };
}

export function localHHmm(utcIso: string): string {
  return formatInTimeZone(new Date(utcIso), BOGOTA, 'HH:mm');
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @bymariap/admin test`
Expected: PASS — all calendar-utils tests green.

- [x] **Step 5: Commit**

```bash
git add apps/admin/src/components/calendar/calendar-utils.ts apps/admin/src/components/calendar/calendar-utils.test.ts
git commit -m "feat(admin): pure calendar date helpers (Bogota tz) with tests"
```

---

## Task 8: `Calendar` component + views

**Files:**
- Create: `apps/admin/src/components/calendar/day-view.tsx`
- Create: `apps/admin/src/components/calendar/week-view.tsx`
- Create: `apps/admin/src/components/calendar/month-view.tsx`
- Create: `apps/admin/src/components/calendar/calendar.tsx`

The calendar is presentation-only. It receives `blocks` and emits selection callbacks. Hours are shown 06:00–21:00 (a salon-friendly window).

- [x] **Step 1: Define shared types and the day-view**

Create `apps/admin/src/components/calendar/day-view.tsx`:

```tsx
import { blockPosition } from './calendar-utils';
import { format } from 'date-fns';

export interface CalendarBlock {
  id: string;
  start: string; // ISO UTC
  end: string;   // ISO UTC
  label: string;
  color: string; // CSS color
  columnKey?: string;
}

export interface CalendarColumn {
  key: string;
  label: string;
}

const DAY_START = 6 * 60; // 06:00
const DAY_END = 21 * 60;  // 21:00
const PX_PER_MIN = 0.8;   // 48px per hour

interface DayViewProps {
  date: Date;
  blocks: CalendarBlock[];
  columns?: CalendarColumn[];
  onSelectDate?: (dayKey: string, minute: number) => void;
  onSelectBlock?: (blockId: string) => void;
}

export function DayView({ date, blocks, columns, onSelectDate, onSelectBlock }: DayViewProps) {
  const dayKey = format(date, 'yyyy-MM-dd');
  const cols: CalendarColumn[] = columns && columns.length > 0
    ? columns
    : [{ key: '__single', label: '' }];

  const hours: number[] = [];
  for (let h = DAY_START; h < DAY_END; h += 60) hours.push(h);
  const totalH = (DAY_END - DAY_START) * PX_PER_MIN;

  function blocksFor(colKey: string) {
    return blocks
      .map((b) => ({ b, pos: blockPosition(b.start, b.end) }))
      .filter(({ b, pos }) => pos.dayKey === dayKey && (cols.length === 1 || b.columnKey === colKey));
  }

  return (
    <div className="flex text-xs">
      <div className="w-12 shrink-0">
        <div className="h-6" />
        {hours.map((h) => (
          <div key={h} style={{ height: 60 * PX_PER_MIN }} className="text-right pr-1 text-muted-foreground">
            {String(h / 60).padStart(2, '0')}:00
          </div>
        ))}
      </div>
      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
        {cols.map((col) => (
          <div key={col.key} className="border-l border-border">
            {col.label && <div className="h-6 text-center text-muted-foreground">{col.label}</div>}
            {!col.label && <div className="h-6" />}
            <div className="relative" style={{ height: totalH }}
              onClick={(e) => {
                if (!onSelectDate) return;
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const minute = DAY_START + Math.floor(((e.clientY - rect.top) / PX_PER_MIN) / 30) * 30;
                onSelectDate(dayKey, minute);
              }}
            >
              {hours.map((h) => (
                <div key={h} style={{ top: (h - DAY_START) * PX_PER_MIN, height: 60 * PX_PER_MIN }}
                  className="absolute inset-x-0 border-t border-border/50" />
              ))}
              {blocksFor(col.key).map(({ b, pos }) => (
                <button key={b.id} type="button"
                  onClick={(e) => { e.stopPropagation(); onSelectBlock?.(b.id); }}
                  style={{
                    top: (pos.startMinute - DAY_START) * PX_PER_MIN,
                    height: Math.max((pos.endMinute - pos.startMinute) * PX_PER_MIN, 14),
                    background: b.color,
                  }}
                  className="absolute inset-x-1 rounded px-1 text-left text-white text-[10px] overflow-hidden"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [x] **Step 2: Create the week-view**

Create `apps/admin/src/components/calendar/week-view.tsx`:

```tsx
import { format } from 'date-fns';
import { weekDays, blockPosition } from './calendar-utils';
import type { CalendarBlock } from './day-view';

const DAY_START = 6 * 60;
const DAY_END = 21 * 60;
const PX_PER_MIN = 0.7;

interface WeekViewProps {
  date: Date;
  blocks: CalendarBlock[];
  onSelectDate?: (dayKey: string, minute: number) => void;
  onSelectBlock?: (blockId: string) => void;
}

export function WeekView({ date, blocks, onSelectDate, onSelectBlock }: WeekViewProps) {
  const days = weekDays(date);
  const hours: number[] = [];
  for (let h = DAY_START; h < DAY_END; h += 60) hours.push(h);
  const totalH = (DAY_END - DAY_START) * PX_PER_MIN;

  return (
    <div className="flex text-xs">
      <div className="w-12 shrink-0">
        <div className="h-8" />
        {hours.map((h) => (
          <div key={h} style={{ height: 60 * PX_PER_MIN }} className="text-right pr-1 text-muted-foreground">
            {String(h / 60).padStart(2, '0')}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7">
        {days.map((d) => {
          const dayKey = format(d, 'yyyy-MM-dd');
          const dayBlocks = blocks
            .map((b) => ({ b, pos: blockPosition(b.start, b.end) }))
            .filter(({ pos }) => pos.dayKey === dayKey);
          return (
            <div key={dayKey} className="border-l border-border">
              <div className="h-8 text-center text-muted-foreground capitalize">
                {format(d, 'EEE d')}
              </div>
              <div className="relative" style={{ height: totalH }}
                onClick={(e) => {
                  if (!onSelectDate) return;
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const minute = DAY_START + Math.floor(((e.clientY - rect.top) / PX_PER_MIN) / 30) * 30;
                  onSelectDate(dayKey, minute);
                }}
              >
                {hours.map((h) => (
                  <div key={h} style={{ top: (h - DAY_START) * PX_PER_MIN, height: 60 * PX_PER_MIN }}
                    className="absolute inset-x-0 border-t border-border/50" />
                ))}
                {dayBlocks.map(({ b, pos }) => (
                  <button key={b.id} type="button"
                    onClick={(e) => { e.stopPropagation(); onSelectBlock?.(b.id); }}
                    style={{
                      top: (pos.startMinute - DAY_START) * PX_PER_MIN,
                      height: Math.max((pos.endMinute - pos.startMinute) * PX_PER_MIN, 12),
                      background: b.color,
                    }}
                    className="absolute inset-x-0.5 rounded px-1 text-left text-white text-[9px] overflow-hidden"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [x] **Step 3: Create the month-view**

Create `apps/admin/src/components/calendar/month-view.tsx`:

```tsx
import { format, isSameMonth } from 'date-fns';
import { monthGrid, blockPosition } from './calendar-utils';
import type { CalendarBlock } from './day-view';

interface MonthViewProps {
  date: Date;
  blocks: CalendarBlock[];
  onSelectDate?: (dayKey: string, minute: number) => void;
}

export function MonthView({ date, blocks, onSelectDate }: MonthViewProps) {
  const weeks = monthGrid(date);
  const countByDay = new Map<string, number>();
  for (const b of blocks) {
    const { dayKey } = blockPosition(b.start, b.end);
    countByDay.set(dayKey, (countByDay.get(dayKey) ?? 0) + 1);
  }
  const dows = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="text-xs">
      <div className="grid grid-cols-7">
        {dows.map((d) => (
          <div key={d} className="text-center py-1 text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((d) => {
          const dayKey = format(d, 'yyyy-MM-dd');
          const n = countByDay.get(dayKey) ?? 0;
          return (
            <button key={dayKey} type="button"
              onClick={() => onSelectDate?.(dayKey, 9 * 60)}
              className={`h-20 border border-border/60 p-1 text-left align-top ${
                isSameMonth(d, date) ? '' : 'bg-muted/40 text-muted-foreground'
              }`}
            >
              <div>{format(d, 'd')}</div>
              {n > 0 && <div className="mt-1 inline-block rounded-full bg-primary/15 text-primary px-1.5 text-[10px]">{n}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [x] **Step 4: Create the `Calendar` container**

Create `apps/admin/src/components/calendar/calendar.tsx`:

```tsx
import { type ReactNode } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { navigate, visibleRange, type CalendarView } from './calendar-utils';
import { DayView, type CalendarBlock, type CalendarColumn } from './day-view';
import { WeekView } from './week-view';
import { MonthView } from './month-view';

export type { CalendarBlock, CalendarColumn } from './day-view';
export type { CalendarView } from './calendar-utils';
export { visibleRange };

interface CalendarProps {
  view: CalendarView;
  date: Date;
  blocks: CalendarBlock[];
  columns?: CalendarColumn[];
  onViewChange: (v: CalendarView) => void;
  onDateChange: (d: Date) => void;
  onSelectDate?: (dayKey: string, minute: number) => void;
  onSelectBlock?: (blockId: string) => void;
  rightSlot?: ReactNode;
}

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: 'month', label: 'Mes' },
  { key: 'week', label: 'Semana' },
  { key: 'day', label: 'Día' },
];

export function Calendar({
  view, date, blocks, columns, onViewChange, onDateChange,
  onSelectDate, onSelectBlock, rightSlot,
}: CalendarProps) {
  const title =
    view === 'month' ? format(date, 'MMMM yyyy')
    : view === 'week' ? (() => { const r = visibleRange('week', date); return `${r.from} – ${r.to}`; })()
    : format(date, 'EEEE d MMM yyyy');

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b border-border gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onDateChange(navigate(view, date, 0))}>Hoy</Button>
          <Button variant="outline" size="sm" onClick={() => onDateChange(navigate(view, date, -1))}>‹</Button>
          <Button variant="outline" size="sm" onClick={() => onDateChange(navigate(view, date, 1))}>›</Button>
          <strong className="text-sm capitalize">{title}</strong>
        </div>
        <div className="flex items-center gap-2">
          {rightSlot}
          <div className="flex border border-border rounded-md overflow-hidden">
            {VIEWS.map((v) => (
              <button key={v.key} onClick={() => onViewChange(v.key)}
                className={cn('px-3 py-1 text-sm', view === v.key ? 'bg-foreground text-background' : 'text-muted-foreground')}
              >{v.label}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-2 overflow-auto max-h-[70vh]">
        {view === 'month' && <MonthView date={date} blocks={blocks} onSelectDate={onSelectDate} />}
        {view === 'week' && <WeekView date={date} blocks={blocks} onSelectDate={onSelectDate} onSelectBlock={onSelectBlock} />}
        {view === 'day' && <DayView date={date} blocks={blocks} columns={columns} onSelectDate={onSelectDate} onSelectBlock={onSelectBlock} />}
      </div>
    </div>
  );
}
```

- [x] **Step 5: Typecheck**

Run: `pnpm --filter @bymariap/admin typecheck`
Expected: no TypeScript errors.

- [x] **Step 6: Commit**

```bash
git add apps/admin/src/components/calendar
git commit -m "feat(admin): presentation-only Calendar component (month/week/day views)"
```

---

## Task 9: Rewrite "Mi agenda" (role-aware) + nav

**Files:**
- Modify: `apps/admin/src/features/availability/api.ts`
- Modify: `apps/admin/src/features/availability/availability-page.tsx`
- Modify: `apps/admin/src/features/availability/availability-window-dialog.tsx`
- Modify: `apps/admin/src/components/app-shell.tsx`

- [x] **Step 1: Extend the availability API client**

Replace `apps/admin/src/features/availability/api.ts` with:

```ts
import { api } from '@/lib/api';
import type { AvailabilityWindowDTO } from '@bymariap/types';

export interface PublishInput { date: string; startMinute: number; endMinute: number }

export const availabilityApi = {
  // specialist (self)
  listMine: (fromDate: string, toDate: string) =>
    api.get<AvailabilityWindowDTO[]>(`/me/availability?fromDate=${fromDate}&toDate=${toDate}`),
  publishMine: (data: PublishInput) =>
    api.post<AvailabilityWindowDTO>('/me/availability', data),
  removeMine: (id: string) => api.delete(`/me/availability/${id}`),

  // admin (any specialist)
  listForSpecialist: (specialistId: string, fromDate: string, toDate: string) =>
    api.get<AvailabilityWindowDTO[]>(`/admin/availability?specialistId=${specialistId}&fromDate=${fromDate}&toDate=${toDate}`),
  publishFor: (specialistId: string, data: PublishInput) =>
    api.post<AvailabilityWindowDTO>('/admin/availability', { specialistId, ...data }),
  removeAny: (id: string) => api.delete(`/admin/availability/${id}`),
};
```

- [x] **Step 2: Update the publish dialog to accept context**

Replace `apps/admin/src/features/availability/availability-window-dialog.tsx` with:

```tsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { availabilityApi } from "./api";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
export function minutesToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  // when set, publish for this specialist via admin route; otherwise self.
  specialistId?: string | null;
  // optional prefill from clicking an empty cell
  prefill?: { date: string; startMinute: number } | null;
}

export function AvailabilityWindowDialog({ open, onOpenChange, specialistId, prefill }: Props) {
  const qc = useQueryClient();
  const [date, setDate] = useState(prefill?.date ?? "");
  const [startTime, setStartTime] = useState(prefill ? minutesToTime(prefill.startMinute) : "08:00");
  const [endTime, setEndTime] = useState("17:00");

  const publish = useMutation({
    mutationFn: () => {
      const data = { date, startMinute: timeToMinutes(startTime), endMinute: timeToMinutes(endTime) };
      return specialistId
        ? availabilityApi.publishFor(specialistId, data)
        : availabilityApi.publishMine(data);
    },
    onSuccess: () => {
      toast.success("Disponibilidad publicada");
      qc.invalidateQueries({ queryKey: ["availability"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return toast.error("Selecciona una fecha");
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      return toast.error("La hora de fin debe ser posterior a la de inicio");
    }
    publish.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Publicar disponibilidad">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Hora de inicio</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>Hora de fin</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        </div>
        <Button type="submit" disabled={publish.isPending}>Publicar</Button>
      </form>
    </Dialog>
  );
}
```

> Note: the dialog is remounted with a fresh `key` from the page each time it opens, so `useState(prefill)` initializers pick up new prefill values (see Step 3).

- [x] **Step 3: Rewrite the availability page**

Replace `apps/admin/src/features/availability/availability-page.tsx` with:

```tsx
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AvailabilityWindowDTO } from "@bymariap/types";
import { availabilityApi, type PublishInput } from "./api";
import { AvailabilityWindowDialog, minutesToTime } from "./availability-window-dialog";
import { specialistsApi } from "@/features/specialists/api";
import { useMe } from "@/features/auth/use-me";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Calendar, type CalendarBlock, type CalendarView, visibleRange } from "@/components/calendar/calendar";

// Availability windows store local Bogota minutes on a local date. Build the
// UTC ISO instants the Calendar expects: local Bogota is UTC-5 (no DST).
function windowToBlock(w: AvailabilityWindowDTO): CalendarBlock {
  const day = w.date.slice(0, 10);
  const toIso = (min: number) => {
    const utcMin = min + 5 * 60; // local -> UTC (+5h)
    const hh = String(Math.floor(utcMin / 60) % 24).padStart(2, "0");
    const mm = String(utcMin % 60).padStart(2, "0");
    const dayShift = Math.floor(utcMin / 60 / 24); // crosses midnight if late
    const d = new Date(`${day}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + dayShift);
    return `${d.toISOString().slice(0, 10)}T${hh}:${mm}:00.000Z`;
  };
  return {
    id: w.id,
    start: toIso(w.startMinute),
    end: toIso(w.endMinute),
    label: `${minutesToTime(w.startMinute)}–${minutesToTime(w.endMinute)}`,
    color: "#c79a82",
  };
}

export function AvailabilityPage() {
  const me = useMe();
  const qc = useQueryClient();
  const isAdmin = me.data?.role.name === "admin";

  const [view, setView] = useState<CalendarView>("week");
  const [date, setDate] = useState(new Date());
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ date: string; startMinute: number } | null>(null);

  // Admin: list of specialists for the selector.
  const specialists = useQuery({
    queryKey: ["specialists"],
    queryFn: specialistsApi.list,
    enabled: isAdmin,
  });

  // The specialist whose agenda we manage: admin picks one; specialist = self.
  const targetSpecialistId = isAdmin ? selectedSpecialist : (me.data?.specialist?.id ?? "");
  const range = useMemo(() => visibleRange(view, date), [view, date]);

  const windows = useQuery({
    queryKey: ["availability", targetSpecialistId, range.from, range.to, isAdmin],
    queryFn: () =>
      isAdmin
        ? availabilityApi.listForSpecialist(targetSpecialistId, range.from, range.to)
        : availabilityApi.listMine(range.from, range.to),
    enabled: isAdmin ? Boolean(targetSpecialistId) : Boolean(me.data?.specialist),
  });

  const remove = useMutation({
    mutationFn: (id: string) => (isAdmin ? availabilityApi.removeAny(id) : availabilityApi.removeMine(id)),
    onSuccess: () => {
      toast.success("Eliminado");
      qc.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  if (me.data && !isAdmin && !me.data.specialist) {
    return (
      <p className="text-muted-foreground text-sm">
        Esta sección es para usuarios con perfil de especialista. Pide a un
        administrador que te asigne uno desde &quot;Especialistas&quot;.
      </p>
    );
  }

  const blocks = (windows.data ?? []).map(windowToBlock);

  function openCreate(p: { date: string; startMinute: number } | null) {
    if (isAdmin && !targetSpecialistId) {
      toast.error("Selecciona un especialista primero");
      return;
    }
    setPrefill(p);
    setDialogOpen(true);
  }

  function onSelectBlock(id: string) {
    if (confirm("¿Eliminar esta disponibilidad?")) remove.mutate(id);
  }

  return (
    <div className="space-y-4">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Mi agenda</h1>
        <Button onClick={() => openCreate(null)}>+ Publicar disponibilidad</Button>
      </header>

      <Calendar
        view={view}
        date={date}
        blocks={blocks}
        onViewChange={setView}
        onDateChange={setDate}
        onSelectDate={(dayKey, minute) => openCreate({ date: dayKey, startMinute: minute })}
        onSelectBlock={onSelectBlock}
        rightSlot={
          isAdmin ? (
            <Select
              value={selectedSpecialist}
              onChange={(e) => setSelectedSpecialist(e.target.value)}
              className="w-56"
            >
              <option value="">Selecciona especialista…</option>
              {specialists.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user.fullName}
                </option>
              ))}
            </Select>
          ) : null
        }
      />

      {dialogOpen && (
        <AvailabilityWindowDialog
          key={`${prefill?.date ?? "new"}-${prefill?.startMinute ?? 0}`}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          specialistId={isAdmin ? targetSpecialistId : null}
          prefill={prefill}
        />
      )}
    </div>
  );
}
```

- [x] **Step 4: Update nav visibility in `app-shell.tsx`**

In `apps/admin/src/components/app-shell.tsx`, find the `"/mi-agenda"` nav entry:

```ts
  { to: "/mi-agenda", label: "Mi agenda", visible: hasSpecialistProfile },
```

Replace its `visible` predicate so admins (even without a profile) can manage agendas:

```ts
  { to: "/mi-agenda", label: "Mi agenda", visible: (u) => isAdmin(u) || hasSpecialistProfile(u) },
```

- [x] **Step 5: Typecheck + build**

Run: `pnpm --filter @bymariap/admin typecheck && pnpm --filter @bymariap/admin build`
Expected: no errors; build succeeds.

- [x] **Step 6: Commit**

```bash
git add apps/admin/src/features/availability apps/admin/src/components/app-shell.tsx
git commit -m "feat(admin): calendar-based Mi agenda with admin specialist selector"
```

---

## Task 10: Rewrite "Citas" (calendar + list toggle)

**Files:**
- Modify: `apps/admin/src/features/appointments/api.ts`
- Modify: `apps/admin/src/features/appointments/appointments-page.tsx`

- [x] **Step 1: Extend the appointments API client**

Replace `apps/admin/src/features/appointments/api.ts` with:

```ts
import { api } from '@/lib/api';
import type { AppointmentDTO, AppointmentStatus } from '@bymariap/types';

export const appointmentsApi = {
  list: (params: { status?: AppointmentStatus; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    const qs = q.toString();
    return api.get<AppointmentDTO[]>(`/admin/appointments${qs ? `?${qs}` : ''}`);
  },
  setStatus: (id: string, status: AppointmentStatus) =>
    api.patch<AppointmentDTO>(`/admin/appointments/${id}/status`, { status }),
};
```

- [x] **Step 2: Rewrite the appointments page**

Replace `apps/admin/src/features/appointments/appointments-page.tsx` with:

```tsx
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AppointmentDTO, AppointmentStatus } from "@bymariap/types";
import { appointmentsApi } from "./api";
import { specialistsApi } from "@/features/specialists/api";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  Calendar, type CalendarBlock, type CalendarColumn, type CalendarView, visibleRange,
} from "@/components/calendar/calendar";

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  scheduled: "#c79a82",
  completed: "#8c9b7e",
  no_show: "#56606a",
  cancelled: "#b0aab0",
};
const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: "Agendada", completed: "Completada", cancelled: "Cancelada", no_show: "No asistió",
};
const statusOptions: { value: AppointmentStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "scheduled", label: "Agendadas" },
  { value: "completed", label: "Completadas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "no_show", label: "No asistió" },
];
const bogotaFmt = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short",
});

// local Bogota date range (YYYY-MM-DD) -> UTC ISO bounds for the backend.
function rangeToUtc(from: string, to: string) {
  const fromUtc = new Date(`${from}T05:00:00.000Z`); // 00:00 Bogota
  const toUtc = new Date(`${to}T05:00:00.000Z`);
  toUtc.setUTCDate(toUtc.getUTCDate() + 1); // exclusive end of last day
  return { from: fromUtc.toISOString(), to: toUtc.toISOString() };
}

export function AppointmentsPage() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"calendar" | "list">("calendar");
  const [view, setView] = useState<CalendarView>("day");
  const [date, setDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "">("");
  const [selected, setSelected] = useState<AppointmentDTO | null>(null);

  const range = useMemo(() => visibleRange(view, date), [view, date]);
  const utc = useMemo(() => rangeToUtc(range.from, range.to), [range]);

  const specialists = useQuery({ queryKey: ["specialists"], queryFn: specialistsApi.list });

  const list = useQuery({
    queryKey: ["appointments", statusFilter, utc.from, utc.to, mode],
    queryFn: () =>
      appointmentsApi.list(
        mode === "calendar"
          ? { status: statusFilter || undefined, from: utc.from, to: utc.to }
          : { status: statusFilter || undefined },
      ),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsApi.setStatus(id, status),
    onSuccess: () => {
      toast.success("Estado actualizado");
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const columns: CalendarColumn[] = (specialists.data ?? []).map((s) => ({
    key: s.id, label: s.user.fullName.split(" ")[0],
  }));

  const blocks: CalendarBlock[] = (list.data ?? []).map((a) => ({
    id: a.id,
    start: a.scheduledAt,
    end: new Date(new Date(a.scheduledAt).getTime() + a.durationMinutes * 60000).toISOString(),
    label: `${a.serviceName} · ${a.guestFullName ?? "Cliente"}`,
    color: STATUS_COLOR[a.status],
    columnKey: a.specialistId,
  }));

  const selectedFull = selected;

  return (
    <div className="space-y-4">
      <header className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Citas</h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | "")} className="w-40">
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <div className="flex border border-border rounded-md overflow-hidden text-sm">
            <button onClick={() => setMode("calendar")} className={mode === "calendar" ? "px-3 py-1 bg-foreground text-background" : "px-3 py-1 text-muted-foreground"}>Calendario</button>
            <button onClick={() => setMode("list")} className={mode === "list" ? "px-3 py-1 bg-foreground text-background" : "px-3 py-1 text-muted-foreground"}>Lista</button>
          </div>
        </div>
      </header>

      {mode === "calendar" && (
        <Calendar
          view={view}
          date={date}
          blocks={blocks}
          columns={view === "day" ? columns : undefined}
          onViewChange={setView}
          onDateChange={setDate}
          onSelectBlock={(id) => setSelected((list.data ?? []).find((a) => a.id === id) ?? null)}
        />
      )}

      {mode === "list" && (
        <>
          {list.data && list.data.length === 0 && (
            <p className="text-muted-foreground text-sm">Sin citas para este filtro.</p>
          )}
          {list.data && list.data.length > 0 && (
            <Table>
              <THead>
                <TR><TH>Fecha</TH><TH>Cliente</TH><TH>Servicio</TH><TH>Especialista</TH><TH>Estado</TH><TH>Acciones</TH></TR>
              </THead>
              <TBody>
                {list.data.map((a) => (
                  <TR key={a.id}>
                    <TD>{bogotaFmt.format(new Date(a.scheduledAt))}</TD>
                    <TD className="text-sm">{a.guestFullName ?? a.guestEmail ?? a.customerId ?? "—"}</TD>
                    <TD>{a.serviceName}</TD>
                    <TD>{a.specialistName}</TD>
                    <TD className="text-muted-foreground">{statusLabels[a.status]}</TD>
                    <TD>
                      {a.status === "scheduled" && (
                        <div className="flex gap-1 flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: a.id, status: "completed" })} disabled={setStatus.isPending}>Completada</Button>
                          <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: a.id, status: "no_show" })} disabled={setStatus.isPending}>No asistió</Button>
                          <Button size="sm" variant="destructive" onClick={() => confirm("¿Cancelar cita?") && setStatus.mutate({ id: a.id, status: "cancelled" })} disabled={setStatus.isPending}>Cancelar</Button>
                        </div>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </>
      )}

      {selectedFull && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-background rounded-lg p-5 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">{selectedFull.serviceName}</h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{bogotaFmt.format(new Date(selectedFull.scheduledAt))} · {selectedFull.specialistName}</p>
              <p>{selectedFull.guestFullName ?? selectedFull.guestEmail ?? "Cliente"}</p>
              {selectedFull.guestPhone && <p>Tel: {selectedFull.guestPhone}</p>}
              <p>Estado: {statusLabels[selectedFull.status]}</p>
            </div>
            {selectedFull.status === "scheduled" && (
              <div className="flex flex-col gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: selectedFull.id, status: "completed" })} disabled={setStatus.isPending}>Marcar completada</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: selectedFull.id, status: "no_show" })} disabled={setStatus.isPending}>No asistió</Button>
                <Button size="sm" variant="destructive" onClick={() => confirm("¿Cancelar cita?") && setStatus.mutate({ id: selectedFull.id, status: "cancelled" })} disabled={setStatus.isPending}>Cancelar</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [x] **Step 2 (cont.): Note on the popover**

The detail uses a simple modal overlay (not the `Dialog` element) so it can show over the calendar with action buttons. This is intentional and self-contained.

- [x] **Step 3: Typecheck + build**

Run: `pnpm --filter @bymariap/admin typecheck && pnpm --filter @bymariap/admin build`
Expected: no errors; build succeeds.

- [x] **Step 4: Commit**

```bash
git add apps/admin/src/features/appointments
git commit -m "feat(admin): calendar-based Citas with per-specialist columns + list toggle"
```

---

## Task 11: Final verification

- [x] **Step 1: Backend tests + build**

Run:
```bash
pnpm --filter @bymariap/api test
pnpm --filter @bymariap/api build
```
Expected: all tests green; build succeeds.

- [x] **Step 2: Admin tests + typecheck + build**

Run:
```bash
pnpm --filter @bymariap/admin test
pnpm --filter @bymariap/admin typecheck
pnpm --filter @bymariap/admin build
```
Expected: calendar-utils tests green; no type errors; build succeeds.

- [ ] **Step 3: Manual smoke (requires app running + demo data)**

1. Login as a specialist → "Mi agenda" opens in Week view; publish a window via the button → block appears; click the block → confirm delete → it disappears.
2. Login as admin → "Mi agenda" → select a specialist in the dropdown → see/publish/delete their windows.
3. Admin → "Citas" → Day view shows per-specialist columns with status-colored blocks; click a scheduled appointment → popover → "Marcar completada" updates it.
4. Toggle "Lista" → the table still works with the status filter.
5. Switch Month/Week/Day and navigate with ‹ Hoy › — data reloads for the visible range.

- [ ] **Step 4: Commit any smoke fixes**

```bash
git add -A
git commit -m "fix(admin): calendar smoke-test fixes"
```

---

## Acceptance criteria

- **Backend:** `availability:write` exists; `POST /admin/availability` and `DELETE /admin/availability/:id` let an admin manage any specialist's windows (specialist role rejected); `GET /admin/appointments?from&to` filters by range; `removeAny` + `listAdmin` range covered by passing tests; full API suite green.
- **Mi agenda:** calendar (Week default) with Month/Day switch; specialist sees own agenda, admin sees a specialist selector; create via button or empty-cell click; delete via block click.
- **Citas:** calendar (Day default) with per-specialist columns, status-colored blocks, click-to-act popover, and a Calendar/List toggle preserving the existing table + status filter.
- **Nav:** "Mi agenda" visible for admin or specialist-with-profile.
- `calendar-utils` unit tests green; admin typechecks and builds clean.

## Out of scope

- Drag & drop create/move/resize.
- Reagendar (moving) appointments.
- Storefront calendar, `.ics` export, reminders, third-party calendar libs.
- React component/render tests (admin has no React testing infra today; TDD focuses on the pure `calendar-utils`).
