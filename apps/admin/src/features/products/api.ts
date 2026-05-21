import type { ProductDTO, ProductStatus } from "@bymariap/types";
import { api } from "@/lib/api";

export interface ProductInput {
  name: string;
  slug: string;
  description?: string;
  priceCop: number;
  stockQuantity: number;
  imageUrls: string[];
  categoryIds: string[];
  status: ProductStatus;
}

export const productsApi = {
  list: (params?: { status?: ProductStatus; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return api.get<ProductDTO[]>(`/admin/products${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => api.get<ProductDTO>(`/admin/products/${id}`),
  create: (data: ProductInput) => api.post<ProductDTO>("/admin/products", data),
  update: (id: string, data: Partial<ProductInput>) =>
    api.patch<ProductDTO>(`/admin/products/${id}`, data),
  remove: (id: string) => api.delete(`/admin/products/${id}`),
};
