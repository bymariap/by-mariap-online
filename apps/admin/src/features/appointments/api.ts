import { api } from '@/lib/api';
import type { AppointmentDTO, AppointmentStatus } from '@bymariap/types';

export const appointmentsApi = {
  list: (status?: AppointmentStatus) =>
    api.get<AppointmentDTO[]>(`/admin/appointments${status ? `?status=${status}` : ''}`),
  setStatus: (id: string, status: AppointmentStatus) =>
    api.patch<AppointmentDTO>(`/admin/appointments/${id}/status`, { status }),
  mine: () => api.get<AppointmentDTO[]>('/me/appointments'),
};
