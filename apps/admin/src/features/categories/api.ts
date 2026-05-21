import type { CategoryDTO } from "@bymariap/types";
import { api } from "@/lib/api";

export const categoriesApi = {
  list: () => api.get<CategoryDTO[]>("/admin/categories"),
  create: (data: { name: string; slug: string }) =>
    api.post<CategoryDTO>("/admin/categories", data),
  update: (id: string, data: { name?: string; slug?: string }) =>
    api.patch<CategoryDTO>(`/admin/categories/${id}`, data),
  remove: (id: string) => api.delete(`/admin/categories/${id}`),
};
