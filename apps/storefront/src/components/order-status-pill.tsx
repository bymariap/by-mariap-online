import { cn } from '@/lib/cn';
import type { OrderStatus } from '@bymariap/types';

const styles: Record<OrderStatus, { label: string; className: string }> = {
  pending:   { label: 'Pago pendiente', className: 'bg-muted text-muted-foreground' },
  paid:      { label: 'Pagado',         className: 'bg-surface-high text-foreground' },
  preparing: { label: 'En preparación', className: 'bg-surface-high text-foreground' },
  shipped:   { label: 'Enviado',        className: 'bg-accent-container text-accent-container-foreground' },
  delivered: { label: 'Entregado',      className: 'bg-accent-container text-accent-container-foreground' },
  cancelled: { label: 'Cancelado',      className: 'bg-destructive/10 text-destructive' },
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  const { label, className } = styles[status];
  return (
    <span className={cn('inline-block rounded-full px-4 py-1 text-xs font-body font-medium uppercase tracking-wide', className)}>
      {label}
    </span>
  );
}
