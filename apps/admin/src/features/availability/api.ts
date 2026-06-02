import { api } from '@/lib/api';
import type { AvailabilityWindowDTO } from '@bymariap/types';

export const availabilityApi = {
  listMine: (fromDate: string, toDate: string) =>
    api.get<AvailabilityWindowDTO[]>(`/me/availability?fromDate=${fromDate}&toDate=${toDate}`),
  publish: (data: { date: string; startMinute: number; endMinute: number }) =>
    api.post<AvailabilityWindowDTO>('/me/availability', data),
  remove: (id: string) => api.delete(`/me/availability/${id}`),
};
