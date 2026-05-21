import { api } from "@/lib/api";

export interface UserRow {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roleId: string;
  role: { id: string; name: string };
}

export interface UserCreateInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  roleId: string;
}
export interface UserUpdateInput {
  fullName?: string;
  phone?: string;
  roleId?: string;
}

export const usersApi = {
  list: () => api.get<UserRow[]>("/admin/users"),
  get: (id: string) => api.get<UserRow>(`/admin/users/${id}`),
  create: (data: UserCreateInput) => api.post<UserRow>("/admin/users", data),
  update: (id: string, data: UserUpdateInput) =>
    api.patch<UserRow>(`/admin/users/${id}`, data),
  remove: (id: string) => api.delete(`/admin/users/${id}`),
};

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
}
export const rolesApi = {
  list: () => api.get<RoleRow[]>("/admin/rbac/roles"),
};
