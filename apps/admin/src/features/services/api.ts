import { api } from '@/lib/api';
import type { ServiceDTO } from '@bymariap/types';

export interface ServiceInput {
  name: string; slug: string; description?: string;
  durationMinutes: number; priceCop: number; status: 'draft' | 'published' | 'archived';
}

export const servicesApi = {
  list:   () => api.get<ServiceDTO[]>('/admin/services'),
  get:    (id: string) => api.get<ServiceDTO>(`/admin/services/${id}`),
  create: (data: ServiceInput) => api.post<ServiceDTO>('/admin/services', data),
  update: (id: string, data: Partial<ServiceInput>) => api.patch<ServiceDTO>(`/admin/services/${id}`, data),
  remove: (id: string) => api.delete(`/admin/services/${id}`),
};
