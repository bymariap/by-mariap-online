import { serverFetch } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import { ProductCard } from "@/components/product-card";
import type { ProductDTO } from "@bymariap/types";

export async function RelatedProducts({
  categorySlug,
  excludeId,
}: {
  categorySlug?: string;
  excludeId: string;
}) {
  let products: ProductDTO[] = [];
  try {
    if (categorySlug) {
      products = await serverFetch<ProductDTO[]>(
        `${endpoints.storeProducts}?categorySlug=${encodeURIComponent(categorySlug)}`,
        { next: { revalidate: 60 } },
      );
    }
    if (products.filter((p) => p.id !== excludeId).length === 0) {
      products = await serverFetch<ProductDTO[]>(endpoints.storeProducts, {
        next: { revalidate: 60 },
      });
    }
  } catch {
    return null;
  }

  const related = products.filter((p) => p.id !== excludeId).slice(0, 4);
  if (related.length === 0) return null;

  return (
    <section className="space-y-8">
      <h2 className="t-display text-foreground">Completa tu rutina</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
