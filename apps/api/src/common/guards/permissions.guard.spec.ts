import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { PermissionsGuard } from './permissions.guard';

function ctx(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => () => {},
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  const reflector = mock<Reflector>();
  const guard = new PermissionsGuard(reflector);
  beforeEach(() => jest.resetAllMocks());

  it('passes when no permissions required', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false); // isPublic
    reflector.getAllAndOverride.mockReturnValueOnce(undefined); // required
    expect(guard.canActivate(ctx({ permissions: [] }))).toBe(true);
  });

  it('passes with wildcard *', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false); // isPublic
    reflector.getAllAndOverride.mockReturnValueOnce(['products:write']); // required
    expect(guard.canActivate(ctx({ permissions: ['*'] }))).toBe(true);
  });

  it('passes with exact match', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false); // isPublic
    reflector.getAllAndOverride.mockReturnValueOnce(['products:write']); // required
    expect(guard.canActivate(ctx({ permissions: ['products:write'] }))).toBe(true);
  });

  it('passes when user has wider scope than required', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false); // isPublic
    reflector.getAllAndOverride.mockReturnValueOnce(['appointments:read:own']); // required
    expect(guard.canActivate(ctx({ permissions: ['appointments:read'] }))).toBe(true);
  });

  it('rejects when missing', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false); // isPublic
    reflector.getAllAndOverride.mockReturnValueOnce(['products:write']); // required
    expect(() => guard.canActivate(ctx({ permissions: ['products:read'] })))
      .toThrow(ForbiddenException);
  });

  it('passes without checking permissions when route is @Public()', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic
    expect(guard.canActivate(ctx(undefined))).toBe(true);
  });
});
