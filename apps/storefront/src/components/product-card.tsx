import Link from "next/link";
import Image from "next/image";
import type { ProductDTO } from "@bymariap/types";
import { formatCop } from "@/lib/format";

export function ProductCard({ product }: { product: ProductDTO }) {
  const img = product.imageUrls[0];
  return (
    <Link href={`/productos/${product.slug}`} className="group block">
      <div className="aspect-square rounded-sm overflow-hidden bg-muted">
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
      </div>
      <div className="mt-3 space-y-0.5">
        <h3 className="t-card text-foreground">
          {product.name}
        </h3>
        <p className="text-sm font-body text-muted-foreground">
          {formatCop(product.priceCop)}
        </p>
      </div>
    </Link>
  );
}
