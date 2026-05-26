import type { MetadataRoute } from 'next';
import { serverFetch } from '@/lib/api/server';
import { endpoints } from '@/lib/api/endpoints';
import type { ProductDTO } from '@bymariap/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  let products: ProductDTO[] = [];
  try {
    products = await serverFetch<ProductDTO[]>(endpoints.storeProducts, { next: { revalidate: 300 } });
  } catch {
    // If API is unreachable during build, just return static routes
    products = [];
  }

  const staticRoutes = ['/', '/productos', '/politica-tratamiento-datos'].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.7,
  }));

  const productRoutes = products.map((p) => ({
    url: `${baseUrl}/productos/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
