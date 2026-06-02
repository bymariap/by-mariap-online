import { api } from '@/lib/api/client';
import type { AppointmentDTO, AvailableSlotDTO, ServiceDTO } from '@bymariap/types';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export const bookingApi = {
  services: (): Promise<ServiceDTO[]> =>
    fetch(`${BASE}/store/services`).then((r) => r.json()),
  serviceBySlug: (slug: string): Promise<ServiceDTO> =>
    fetch(`${BASE}/store/services/${slug}`).then((r) => r.json()),
  slots: (serviceId: string, specialistId: string, date: string) =>
    api.get<AvailableSlotDTO[]>(`/store/availability?serviceId=${serviceId}&specialistId=${specialistId}&date=${date}`),
  book: (input: {
    serviceId: string; specialistId: string; startAt: string;
    guestEmail?: string; guestPhone?: string; guestFullName?: string; notes?: string;
  }) => api.post<AppointmentDTO>('/store/appointments', input),
  specialists: () =>
    api.get<{ id: string; userId: string; user: { fullName: string }; specialties: string[]; avatarUrl: string | null }[]>('/store/specialists'),
  cancelAppointment: (id: string) =>
    api.post<AppointmentDTO>(`/me/appointments/${id}/cancel`),
  myAppointments: () =>
    api.get<AppointmentDTO[]>('/me/appointments'),
};
