"use client";

import Link from "next/link";
import Image from "next/image";
import { Trash2, ShieldCheck } from "lucide-react";
import {
  useCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from "@/lib/cart/hooks";
import { QuantityInput } from "@/components/quantity-input";
import { Separator } from "@/components/ui/separator";
import { formatCop } from "@/lib/format";

export default function CartPage() {
  const cart = useCart();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();

  if (cart.isLoading) {
    return (
      <div className="container py-20 text-center">
        <p className="text-sm font-body text-muted-foreground">
          Cargando carrito…
        </p>
      </div>
    );
  }

  if (!cart.data || cart.data.items.length === 0) {
    return (
      <div className="container py-32 max-w-md mx-auto text-center space-y-6">
        <h1 className="font-heading text-3xl font-semibold text-foreground">
          Tu carrito está vacío
        </h1>
        <p className="text-sm font-body text-muted-foreground leading-relaxed">
          Descubre nuestra colección de productos para el cuidado de tus cejas.
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
    <div className="container py-10">
      <h1 className="font-heading text-3xl font-semibold text-foreground mb-8">
        Tu carrito
      </h1>

      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* ── Product list ── */}
        <div className="flex-1">
          {cart.data.items.map((item, idx) => (
            <div key={item.id}>
              {idx > 0 && <Separator className="my-0" />}
              <div className="py-5 flex items-center gap-4">
                {/* Thumbnail */}
                <div className="h-16 w-16 shrink-0 rounded-sm overflow-hidden bg-muted">
                  {item.productImageUrl ? (
                    <Image
                      src={item.productImageUrl}
                      alt={item.productName}
                      width={120}
                      height={120}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-surface" />
                  )}
                </div>

                {/* Name + unit price */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/productos/${item.productSlug}`}
                    className="text-sm font-body font-medium text-foreground hover:underline line-clamp-2"
                  >
                    {item.productName}
                  </Link>
                  <p className="text-xs font-body text-muted-foreground mt-0.5">
                    {formatCop(item.unitPriceSnapshot)} c/u
                  </p>
                </div>

                {/* Qty stepper */}
                <QuantityInput
                  value={item.quantity}
                  onChange={(q) => update.mutate({ id: item.id, quantity: q })}
                />

                {/* Line total */}
                <p className="w-20 text-right text-sm font-body font-medium text-foreground shrink-0">
                  {formatCop(item.lineTotal)}
                </p>

                {/* Delete */}
                <button
                  onClick={() => remove.mutate(item.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  aria-label={`Eliminar ${item.productName}`}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Summary card ── */}
        <aside className="w-full lg:w-80 shrink-0 lg:sticky lg:top-24">
          <div
            className="bg-white rounded-md p-6 space-y-4"
            style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
          >
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Resumen
            </h2>

            <div className="flex justify-between text-sm font-body">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground font-medium">
                {formatCop(cart.data.subtotal)}
              </span>
            </div>

            <div className="flex justify-between text-sm font-body gap-4">
              <span className="text-muted-foreground shrink-0">Envío</span>
              <span className="text-muted-foreground text-right text-xs">
                El envío se calcula en el siguiente paso.
              </span>
            </div>

            <Separator />

            <div className="flex justify-between font-body">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="text-base font-semibold text-foreground">
                {formatCop(cart.data.subtotal)}
              </span>
            </div>

            <Link
              href="/checkout"
              className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Ir a pagar
            </Link>

            <div className="text-center">
              <Link
                href="/productos"
                className="text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
              >
                Seguir comprando
              </Link>
            </div>

            {/* Envío seguro note */}
            <div
              className="flex items-start gap-2.5 rounded-md p-3"
              style={{ background: "#fadec0" }}
            >
              <ShieldCheck
                className="h-4 w-4 shrink-0 text-foreground mt-0.5"
                strokeWidth={1.5}
              />
              <div>
                <p className="text-xs font-body font-medium text-foreground">
                  Envío Seguro & Premium
                </p>
                <p className="text-xs font-body text-muted-foreground mt-0.5">
                  Cada pedido es preparado con cuidado artesanal en Medellín.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
