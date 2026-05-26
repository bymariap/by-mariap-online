import { cn } from '@/lib/cn';
import type { OrderStatus } from '@bymariap/types';

const styles: Record<OrderStatus, { label: string; className: string }> = {
  pending:   { label: 'Pago pendiente',  className: 'bg-muted text-foreground' },
  paid:      { label: 'Pagado',          className: 'bg-primary text-primary-foreground' },
  preparing: { label: 'En preparación', className: 'bg-primary text-primary-foreground' },
  shipped:   { label: 'Enviado',         className: 'bg-primary text-primary-foreground' },
  delivered: { label: 'Entregado',       className: 'bg-primary text-primary-foreground' },
  cancelled: { label: 'Cancelado',       className: 'bg-destructive text-destructive-foreground' },
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  const { label, className } = styles[status];
  return (
    <span className={cn('inline-block rounded-full px-4 py-1 text-xs font-body font-medium uppercase tracking-wide', className)}>
      {label}
    </span>
  );
}
