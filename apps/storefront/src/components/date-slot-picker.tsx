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

export function DateSlotPicker({ serviceId, specialistId, value, onChange }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  const { data: slots, isLoading } = useQuery({
    queryKey: ['slots', serviceId, specialistId, date],
    queryFn: () => bookingApi.slots(serviceId, specialistId, date),
    enabled: Boolean(specialistId),
  });

  const morning = slots?.filter((s) => {
    const h = parseInt(s.localTime.split(':')[0]);
    return h < 12;
  }) ?? [];
  const afternoon = slots?.filter((s) => {
    const h = parseInt(s.localTime.split(':')[0]);
    return h >= 12;
  }) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-body font-medium text-foreground mb-1">Fecha</label>
        <input
          type="date"
          value={date}
          min={today}
          onChange={(e) => { setDate(e.target.value); onChange(''); }}
          className="h-11 px-3 rounded-md border border-border bg-background text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {isLoading && <p className="text-sm font-body text-muted-foreground">Cargando horarios…</p>}

      {slots && slots.length === 0 && (
        <p className="text-sm font-body text-muted-foreground">No hay disponibilidad para esta fecha.</p>
      )}

      {morning.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wide">Mañana</p>
          <div className="flex flex-wrap gap-2">
            {morning.map((s) => (
              <button key={s.startAt} type="button" onClick={() => onChange(s.startAt)}
                className={cn('h-10 px-4 rounded-full border text-sm font-body transition-colors',
                  value === s.startAt
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-foreground hover:bg-muted'
                )}
              >{s.localTime}</button>
            ))}
          </div>
        </div>
      )}

      {afternoon.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wide">Tarde</p>
          <div className="flex flex-wrap gap-2">
            {afternoon.map((s) => (
              <button key={s.startAt} type="button" onClick={() => onChange(s.startAt)}
                className={cn('h-10 px-4 rounded-full border text-sm font-body transition-colors',
                  value === s.startAt
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-foreground hover:bg-muted'
                )}
              >{s.localTime}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
