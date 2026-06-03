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
