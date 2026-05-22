"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { useAddToCart } from "@/lib/cart/hooks";
import { Button } from "@/components/ui/button";

export function AddToCartButton({ productId }: { productId: string }) {
  const [qty, setQty] = useState(1);
  const mut = useAddToCart();

  return (
    <div className="flex items-center gap-3">
      {/* Qty stepper */}
      <div className="inline-flex items-center border-b border-border">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Reducir cantidad"
        >
          <Minus className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <span className="w-8 text-center text-sm font-body">{qty}</span>
        <button
          type="button"
          onClick={() => setQty((q) => q + 1)}
          className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Aumentar cantidad"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Add button */}
      <Button
        size="lg"
        onClick={() =>
          mut.mutate(
            { productId, quantity: qty },
            {
              onSuccess: () => toast.success("Agregado al carrito"),
              onError: (e: unknown) =>
                toast.error(
                  (e as { message?: string })?.message ?? "No se pudo agregar",
                ),
            },
          )
        }
        disabled={mut.isPending}
        className="flex-1"
      >
        {mut.isPending ? "Agregando…" : "Añadir al carrito"}
      </Button>
    </div>
  );
}
