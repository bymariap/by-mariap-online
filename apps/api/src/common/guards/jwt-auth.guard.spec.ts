import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { JwtAuthGuard } from './jwt-auth.guard';

function ctx(cookies: Record<string, string>, handler = () => {}): ExecutionContext {
  const req: any = { cookies };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => handler,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const reflector = mock<Reflector>();
  const jwt = mock<JwtService>();
  const guard = new JwtAuthGuard(jwt, reflector);

  beforeEach(() => jest.resetAllMocks());

  it('allows @Public() routes', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);
    await expect(guard.canActivate(ctx({}))).resolves.toBe(true);
  });

  it('rejects when access_token cookie missing', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    await expect(guard.canActivate(ctx({}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches user to request when token valid', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    jwt.verifyAsync.mockResolvedValueOnce({
      sub: 'u1', email: 'a@b.c', role: 'admin', permissions: ['*'],
    });
    const c = ctx({ access_token: 'tok' });
    await expect(guard.canActivate(c)).resolves.toBe(true);
    const req = c.switchToHttp().getRequest();
    expect(req.user).toEqual({
      id: 'u1', email: 'a@b.c', role: 'admin', permissions: ['*'], specialistId: undefined,
    });
  });
});
