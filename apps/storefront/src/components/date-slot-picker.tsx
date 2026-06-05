'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookingApi } from '@/lib/booking/api';
import { cn } from '@/lib/cn';

interface Props {
  serviceId: string;
  specialistId: string;
  value: string | null;
  onChange: (startAt: string) => void;
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DateSlotPicker({ serviceId, specialistId, value, onChange }: Props) {
  const todayDate = new Date();
  const today = ymd(todayDate);
  const [date, setDate] = useState(today);
  const [viewMonth, setViewMonth] = useState(
    new Date(todayDate.getFullYear(), todayDate.getMonth(), 1),
  );

  const { data: slots, isLoading } = useQuery({
    queryKey: ['slots', serviceId, specialistId, date],
    queryFn: () => bookingApi.slots(serviceId, specialistId, date),
    enabled: Boolean(specialistId),
  });

  const morning =
    slots?.filter((s) => parseInt(s.localTime.split(':')[0]) < 12) ?? [];
  const afternoon =
    slots?.filter((s) => parseInt(s.localTime.split(':')[0]) >= 12) ?? [];

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  const isCurrentMonth =
    year === todayDate.getFullYear() && month === todayDate.getMonth();
  const monthLabel = new Intl.DateTimeFormat('es-CO', {
    month: 'long',
    year: 'numeric',
  }).format(viewMonth);

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={isCurrentMonth}
            onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted text-foreground disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <p className="font-heading text-base text-foreground capitalize">
            {monthLabel}
          </p>
          <button
            type="button"
            onClick={() => setViewMonth(new Date(year, month + 1, 1))}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted text-foreground"
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-body text-muted-foreground">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const key = ymd(d);
            const isPast = key < today;
            const isSelected = key === date;
            return (
              <button
                key={i}
                type="button"
                disabled={isPast}
                onClick={() => {
                  setDate(key);
                  onChange('');
                }}
                className={cn(
                  'h-10 rounded-full text-sm font-body transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : isPast
                      ? 'text-muted-foreground/40 cursor-not-allowed'
                      : 'text-foreground hover:bg-muted',
                )}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots */}
      {isLoading && (
        <p className="text-sm font-body text-muted-foreground">Cargando horarios…</p>
      )}

      {slots && slots.length === 0 && (
        <p className="text-sm font-body text-muted-foreground">
          No hay disponibilidad para esta fecha.
        </p>
      )}

      {morning.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wide">
            Mañana
          </p>
          <div className="flex flex-wrap gap-2">
            {morning.map((s) => (
              <button
                key={s.startAt}
                type="button"
                onClick={() => onChange(s.startAt)}
                className={cn(
                  'h-10 px-4 rounded-full border text-sm font-body transition-colors',
                  value === s.startAt
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-foreground hover:bg-muted',
                )}
              >
                {s.localTime}
              </button>
            ))}
          </div>
        </div>
      )}

      {afternoon.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wide">
            Tarde
          </p>
          <div className="flex flex-wrap gap-2">
            {afternoon.map((s) => (
              <button
                key={s.startAt}
                type="button"
                onClick={() => onChange(s.startAt)}
                className={cn(
                  'h-10 px-4 rounded-full border text-sm font-body transition-colors',
                  value === s.startAt
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-foreground hover:bg-muted',
                )}
              >
                {s.localTime}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
