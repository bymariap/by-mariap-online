import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';
export const RequirePermissions = (...perms: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, perms);
