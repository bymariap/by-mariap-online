import { api } from '@/lib/api';

export interface SpecialistRow {
  id: string;
  userId: string;
  bio: string | null;
  specialties: string[];
  avatarUrl: string | null;
  user: { id: string; fullName: string; email: string };
}

export interface SpecialistInput {
  bio?: string;
  specialties?: string[];
  avatarUrl?: string;
}

export const specialistsApi = {
  list: () => api.get<SpecialistRow[]>('/admin/specialists'),
  upsert: (userId: string, data: SpecialistInput) =>
    api.put<SpecialistRow>(`/admin/specialists/${userId}`, data),
  remove: (userId: string) => api.delete(`/admin/specialists/${userId}`),
};
