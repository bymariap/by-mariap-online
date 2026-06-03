import { api } from '@/lib/api';
import type { AvailabilityWindowDTO } from '@bymariap/types';

export interface PublishInput { date: string; startMinute: number; endMinute: number }

export const availabilityApi = {
  // specialist (self)
  listMine: (fromDate: string, toDate: string) =>
    api.get<AvailabilityWindowDTO[]>(`/me/availability?fromDate=${fromDate}&toDate=${toDate}`),
  publishMine: (data: PublishInput) =>
    api.post<AvailabilityWindowDTO>('/me/availability', data),
  removeMine: (id: string) => api.delete(`/me/availability/${id}`),

  // admin (any specialist)
  listForSpecialist: (specialistId: string, fromDate: string, toDate: string) =>
    api.get<AvailabilityWindowDTO[]>(`/admin/availability?specialistId=${specialistId}&fromDate=${fromDate}&toDate=${toDate}`),
  publishFor: (specialistId: string, data: PublishInput) =>
    api.post<AvailabilityWindowDTO>('/admin/availability', { specialistId, ...data }),
  removeAny: (id: string) => api.delete(`/admin/availability/${id}`),
};
