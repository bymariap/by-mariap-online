import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch, ApiError } from "@/lib/api/server";
import { endpoints } from "@/lib/api/endpoints";
import { productJsonLd } from "@/lib/seo";
import { formatCop } from "@/lib/format";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { RelatedProducts } from "@/components/related-products";
import {
  ProductUsageSections,
  ProductFaqSection,
} from "@/components/product-detail-placeholders";
import type { ProductDTO } from "@bymariap/types";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

async function fetchProduct(slug: string): Promise<ProductDTO | null> {
  try {
    return await serverFetch<ProductDTO>(endpoints.storeProduct(slug), {
      next: { revalidate: 60 },
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await fetchProduct(slug);
  if (!p) return { title: "Producto no encontrado" };
  return {
    title: p.name,
    description: p.description ?? undefined,
    openGraph: {
      title: p.name,
      description: p.description ?? undefined,
      images: p.imageUrls.map((url) => ({ url })),
    },
  };
}

export default async function ProductDetail({ params }: Props) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const firstCategory = product.categories[0];

  return (
    <article className="container py-10">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd(product, baseUrl)),
        }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 text-xs font-body text-muted-foreground flex gap-1.5">
        <Link
          href="/productos"
          className="hover:text-foreground transition-colors"
        >
          Tienda
        </Link>
        {firstCategory && (
          <>
            <span>/</span>
            <Link
              href={`/productos?categoria=${firstCategory.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {firstCategory.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      {/* Main grid */}
      <div className="grid md:grid-cols-2 gap-12 mb-20 md:mb-24">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-square rounded-md overflow-hidden bg-muted">
            {product.imageUrls[0] ? (
              <Image
                src={product.imageUrls[0]}
                alt={product.name}
                width={900}
                height={900}
                className="h-full w-full object-cover"
                priority
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <span className="text-xs font-body text-muted-foreground">
                  Sin imagen
                </span>
              </div>
            )}
          </div>
          {product.imageUrls.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.imageUrls.slice(1, 5).map((u, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-sm overflow-hidden bg-muted"
                >
                  <Image
                    src={u}
                    alt={`${product.name} ${i + 2}`}
                    width={300}
                    height={300}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buy-box */}
        <div className="space-y-5">
          {/* Category badges */}
          {product.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.categories.map((c) => (
                <Badge key={c.id}>{c.name}</Badge>
              ))}
            </div>
          )}

          <h1 className="t-display text-foreground leading-tight">
            {product.name}
          </h1>

          <p className="text-2xl font-body font-medium text-foreground">
            {formatCop(product.priceCop)}
          </p>

          {product.description && (
            <p className="text-sm font-body font-light text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}

          <p className="text-xs font-body text-muted-foreground">
            Pickup en El Poblado · Envío express 2–4 h en Medellín
          </p>

          <p className="text-sm font-body text-muted-foreground">
            {product.stockQuantity > 0
              ? `Disponibles: ${product.stockQuantity}`
              : "Agotado"}
          </p>

          {product.stockQuantity > 0 && (
            <AddToCartButton productId={product.id} />
          )}
        </div>
      </div>

      {/* Editorial sections */}
      <div className="space-y-20 md:space-y-24">
        <ProductUsageSections />
        <Suspense fallback={null}>
          <RelatedProducts
            categorySlug={firstCategory?.slug}
            excludeId={product.id}
          />
        </Suspense>
        <ProductFaqSection />
      </div>
    </article>
  );
}
