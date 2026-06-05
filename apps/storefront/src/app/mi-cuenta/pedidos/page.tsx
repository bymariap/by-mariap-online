"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/lib/auth/hooks";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { OrderStatusPill } from "@/components/order-status-pill";
import { formatCop, formatDate } from "@/lib/format";
import type { OrderDTO } from "@bymariap/types";

export default function OrdersPage() {
  const me = useMe();
  const orders = useQuery({
    queryKey: ["me-orders"],
    queryFn: () => api.get<OrderDTO[]>(endpoints.meOrders),
    enabled: Boolean(me.data),
  });

  if (!orders.data)
    return (
      <div className="py-8">
        <p className="text-sm font-body text-muted-foreground">
          Cargando pedidos…
        </p>
      </div>
    );

  if (orders.data.length === 0) {
    return (
      <div className="space-y-6 py-8 text-center max-w-sm">
        <h1 className="t-display text-foreground">
          Mis pedidos
        </h1>
        <p className="text-sm font-body text-muted-foreground">
          Aún no has hecho ningún pedido.
        </p>
        <Link
          href="/productos"
          className="inline-flex h-12 px-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="t-display text-foreground">
        Mis pedidos
      </h1>
      <ul className="space-y-3">
        {orders.data.map((o) => (
          <li
            key={o.id}
            className="bg-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
          >
            <div className="flex-1">
              <p className="text-sm font-body font-medium text-foreground">
                {o.reference}
              </p>
              <p className="text-xs font-body text-muted-foreground">
                {formatDate(o.createdAt)} · {formatCop(o.total)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <OrderStatusPill status={o.status} />
              <Link
                href={`/checkout/confirmacion?id=${o.reference}`}
                className="text-xs font-body text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Ver detalle
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
