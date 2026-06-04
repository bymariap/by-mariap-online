import Link from "next/link";
import Image from "next/image";
import type { ProductDTO } from "@bymariap/types";
import { formatCop } from "@/lib/format";
import { QuickAddButton } from "@/components/quick-add-button";

export function ProductCard({ product }: { product: ProductDTO }) {
  const img = product.imageUrls[0];
  const href = `/productos/${product.slug}`;
  return (
    <div className="group">
      <div className="relative aspect-square rounded-sm overflow-hidden bg-muted">
        <Link href={href} className="block h-full w-full">
          {img ? (
            <Image
              src={img}
              alt={product.name}
              width={600}
              height={600}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="h-full w-full bg-surface flex items-center justify-center">
              <span className="text-xs font-body text-muted-foreground">
                Sin imagen
              </span>
            </div>
          )}
        </Link>
        {product.stockQuantity > 0 && (
          <QuickAddButton
            productId={product.id}
            className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
      </div>
      <Link href={href} className="mt-3 block space-y-0.5">
        <h3 className="t-card text-foreground">{product.name}</h3>
        <p className="text-sm font-body text-muted-foreground">
          {formatCop(product.priceCop)}
        </p>
      </Link>
    </div>
  );
}
