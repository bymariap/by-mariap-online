import { Suspense } from "react";
import { serverFetch } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import { ProductCard } from "@/components/product-card";
import { CategoryFilter } from "@/components/category-filter";
import type { CategoryDTO, ProductDTO } from "@bymariap/types";

export const revalidate = 60;

export const metadata = { title: "Tienda" };

interface PageProps {
  searchParams: Promise<{ categoria?: string }>;
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const { categoria } = await searchParams;

  const productsPath = categoria
    ? `${endpoints.storeProducts}?categorySlug=${encodeURIComponent(categoria)}`
    : endpoints.storeProducts;

  let products: ProductDTO[] = [];
  let categories: CategoryDTO[] = [];

  try {
    [products, categories] = await Promise.all([
      serverFetch<ProductDTO[]>(productsPath, { next: { revalidate: 60 } }),
      serverFetch<CategoryDTO[]>(endpoints.storeCategories, {
        next: { revalidate: 300 },
      }),
    ]);
  } catch {
    // API unavailable at build time — render empty state
  }

  return (
    <>
      {/* Promo banner */}
      <div className="bg-muted border-b-0 py-2 text-center">
        <p className="text-xs font-body text-muted-foreground">
          Envío gratis en Medellín por compras superiores a $150.000
        </p>
      </div>

      <div className="container py-10">
        <div className="flex gap-10">
          {/* Sidebar */}
          <aside className="hidden md:block w-52 shrink-0">
            <Suspense fallback={null}>
              <CategoryFilter categories={categories} />
            </Suspense>
          </aside>

          {/* Main content */}
          <div className="flex-1 space-y-6">
            <div>
              <h1 className="font-heading text-3xl font-semibold text-foreground">
                Colección de Cuidado
              </h1>
              <p className="mt-1 text-sm font-body text-muted-foreground">
                {products.length} producto{products.length !== 1 ? "s" : ""}{" "}
                encontrado{products.length !== 1 ? "s" : ""}
              </p>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <p className="text-sm font-body text-muted-foreground py-12 text-center">
                No hay productos en esta categoría.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
