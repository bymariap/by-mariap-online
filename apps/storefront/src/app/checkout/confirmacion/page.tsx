"use client";

import { Suspense } from "react";
import Link from "next/link";
import CheckCircle from "@material-symbols/svg-300/outlined/check_circle.svg?react";
import Schedule from "@material-symbols/svg-300/outlined/schedule.svg?react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { OrderStatusPill } from "@/components/order-status-pill";
import { Separator } from "@/components/ui/separator";
import { formatCop, formatDate } from "@/lib/format";
import type { OrderDTO } from "@bymariap/types";

function ConfirmationContent() {
  const sp = useSearchParams();
  const ref = sp.get("id");

  const order = useQuery<OrderDTO>({
    queryKey: ["order", ref],
    queryFn: () => api.get<OrderDTO>(endpoints.storeOrder(ref!)),
    enabled: Boolean(ref),
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 3000 : false),
  });

  if (!ref)
    return (
      <div className="container py-20 text-center">
        <p className="text-sm font-body text-muted-foreground">
          Falta el id de la orden.
        </p>
      </div>
    );
  if (order.isLoading)
    return (
      <div className="container py-20 text-center">
        <p className="text-sm font-body text-muted-foreground">
          Consultando estado del pago…
        </p>
      </div>
    );
  if (!order.data)
    return (
      <div className="container py-20 text-center">
        <p className="text-sm font-body text-muted-foreground">
          No se encontró la orden.
        </p>
      </div>
    );

  const o = order.data;
  const isSuccess = ["paid", "preparing", "shipped", "delivered"].includes(
    o.status,
  );
  const isPending = o.status === "pending";

  return (
    <div className="container py-12 max-w-3xl">
      {/* Header */}
      <div className="text-center space-y-3 mb-10">
        {isPending ? (
          <Schedule className="h-14 w-14 mx-auto text-muted-foreground" />
        ) : (
          <CheckCircle className="h-14 w-14 mx-auto text-foreground" />
        )}
        <h1 className="t-display text-foreground">
          {isSuccess
            ? "¡Gracias por tu compra!"
            : isPending
              ? "Procesando tu pago…"
              : "Pago no completado"}
        </h1>
        <p className="text-sm font-body text-muted-foreground">
          {isSuccess
            ? "Tu pedido está confirmado"
            : isPending
              ? "Estamos esperando la confirmación del pago."
              : "El pago no fue completado."}
        </p>
        <OrderStatusPill status={o.status} />
        <p className="text-xs font-body text-muted-foreground">
          Referencia: {o.reference}
        </p>
        <p className="text-xs font-body text-muted-foreground">
          {formatDate(o.createdAt)}
        </p>
      </div>

      {/* Two-column detail */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Order summary */}
        <div
          className="bg-white rounded-xl p-5 space-y-3"
          style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
        >
          <h2 className="font-heading text-lg text-foreground">
            Resumen de tu pedido
          </h2>
          {o.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs font-body font-medium text-foreground">
                  {item.nameSnapshot} ×{item.quantity}
                </p>
              </div>
              <p className="text-xs font-body text-foreground shrink-0">
                {formatCop(item.unitPriceSnapshot * item.quantity)}
              </p>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between text-xs font-body">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCop(o.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs font-body">
            <span className="text-muted-foreground">Envío</span>
            <span>{formatCop(o.shippingCost)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-body">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-base font-semibold text-foreground">
              {formatCop(o.total)}
            </span>
          </div>
        </div>

        {/* Delivery address */}
        <div
          className="bg-white rounded-xl p-5 space-y-2"
          style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
        >
          <h2 className="font-heading text-lg text-foreground">
            Dirección de Entrega
          </h2>
          <p className="text-sm font-body text-foreground">
            {o.shippingAddress?.fullName}
          </p>
          <p className="text-sm font-body text-muted-foreground">
            {o.shippingAddress?.address}
          </p>
          <p className="text-sm font-body text-muted-foreground">
            {o.shippingAddress?.city}, Colombia
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/productos"
          className="inline-flex h-12 px-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Seguir comprando
        </Link>
        <Link
          href="/mi-cuenta/pedidos"
          className="inline-flex h-12 px-8 items-center justify-center rounded-full border border-border font-body text-sm font-medium hover:bg-muted transition-colors"
        >
          Ver mis pedidos
        </Link>
      </div>

      {isPending && (
        <p className="mt-6 text-xs font-body text-muted-foreground text-center">
          Esta página se actualiza automáticamente cada pocos segundos.
        </p>
      )}
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-20 text-center">
          <p className="text-sm font-body text-muted-foreground">Cargando…</p>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
