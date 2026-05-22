import type { ProductDTO } from "@bymariap/types";

export function productJsonLd(product: ProductDTO, baseUrl: string) {
  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.imageUrls,
    sku: product.id,
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/productos/${product.slug}`,
      priceCurrency: "COP",
      price: product.priceCop.toString(),
      availability:
        product.stockQuantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };
}
