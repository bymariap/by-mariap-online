import { api } from '@/lib/api';
import type { AppointmentDTO, AppointmentStatus } from '@bymariap/types';

export const appointmentsApi = {
  list: (params: { status?: AppointmentStatus; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    const qs = q.toString();
    return api.get<AppointmentDTO[]>(`/admin/appointments${qs ? `?${qs}` : ''}`);
  },
  setStatus: (id: string, status: AppointmentStatus) =>
    api.patch<AppointmentDTO>(`/admin/appointments/${id}/status`, { status }),
};
