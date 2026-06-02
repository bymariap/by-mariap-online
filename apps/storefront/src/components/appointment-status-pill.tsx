import { cn } from '@/lib/cn';
import type { AppointmentStatus } from '@bymariap/types';

const config: Record<AppointmentStatus, { label: string; className: string }> = {
  scheduled: { label: 'Agendada',    className: 'bg-primary/10 text-primary' },
  completed: { label: 'Completada',  className: 'bg-muted text-foreground' },
  cancelled: { label: 'Cancelada',   className: 'bg-destructive/10 text-destructive' },
  no_show:   { label: 'No asistió',  className: 'bg-destructive/10 text-destructive' },
};

export function AppointmentStatusPill({ status }: { status: AppointmentStatus }) {
  const { label, className } = config[status] ?? config.scheduled;
  return (
    <span className={cn('inline-block rounded-full px-3 py-1 text-xs font-body font-medium', className)}>
      {label}
    </span>
  );
}
