"use client";

import Link from "next/link";
import ShoppingBag from "@material-symbols/svg-300/outlined/shopping_bag.svg?react";
import { useCart } from "@/lib/cart/hooks";

export function CartIconButton() {
  const { data: cart } = useCart();
  const count = cart?.items.reduce((s, it) => s + it.quantity, 0) ?? 0;
  return (
    <Link
      href="/carrito"
      className="relative inline-flex items-center p-1"
      aria-label="Carrito"
    >
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-body font-medium">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
