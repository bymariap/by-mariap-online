import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      REQUIRED_PERMISSIONS_KEY, [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user = ctx.switchToHttp().getRequest().user;
    const owned: string[] = user?.permissions ?? [];
    if (owned.includes('*')) return true;

    const ok = required.every((req) => owned.some((p) => satisfies(p, req)));
    if (!ok) throw new ForbiddenException();
    return true;
  }
}

function satisfies(owned: string, required: string): boolean {
  if (owned === required) return true;
  const [oRes, oAct, oScope] = owned.split(':');
  const [rRes, rAct, rScope] = required.split(':');
  if (oRes !== rRes || oAct !== rAct) return false;
  if (!oScope && rScope) return true;
  return false;
}
