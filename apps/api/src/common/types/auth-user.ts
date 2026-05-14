import type { UserRole } from '@bymariap/types';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
  specialistId?: string;
}
