"use client";

import { toast } from "sonner";
import { useAddToCart } from "@/lib/cart/hooks";
import { cn } from "@/lib/cn";

export function QuickAddButton({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const mut = useAddToCart();

  return (
    <button
      type="button"
      disabled={mut.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        mut.mutate(
          { productId, quantity: 1 },
          {
            onSuccess: () => toast.success("Agregado al carrito"),
            onError: (err: unknown) =>
              toast.error(
                (err as { message?: string })?.message ?? "No se pudo agregar",
              ),
          },
        );
      }}
      className={cn(
        "bg-surface/90 backdrop-blur py-2.5 rounded-full text-xs font-body font-medium uppercase tracking-widest text-foreground hover:bg-surface transition-colors disabled:opacity-50",
        className,
      )}
    >
      {mut.isPending ? "Agregando…" : "Añadir"}
    </button>
  );
}
