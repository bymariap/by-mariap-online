import { mockDeep, mockReset } from 'jest-mock-extended';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService, sha256 } from './auth.service';
import * as pw from '../../common/crypto/password';

const prisma = mockDeep<PrismaService>();
const jwt = mockDeep<JwtService>();
const svc = new AuthService(prisma, jwt);

const userRow = {
  id: 'u1',
  email: 'a@b.c',
  passwordHash: 'hash',
  fullName: 'A',
  phone: null,
  roleId: 'r1',
  role: {
    id: 'r1', name: 'admin', description: null, createdAt: new Date(), updatedAt: new Date(),
    permissions: [{ permission: { key: '*' } }],
  },
  specialist: null,
};

describe('AuthService.login', () => {
  beforeEach(() => { mockReset(prisma); mockReset(jwt); });

  it('returns tokens for valid credentials', async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce(userRow);
    jest.spyOn(pw, 'verifyPassword').mockResolvedValueOnce(true);
    jwt.signAsync.mockResolvedValueOnce('access').mockResolvedValueOnce('refresh');
    (prisma.refreshToken as any).create.mockResolvedValueOnce({});

    const out = await svc.login('a@b.c', 'pw');
    expect(out.accessToken).toBe('access');
    expect(out.refreshToken).toBe('refresh');
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  it('rejects unknown email', async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.login('a@b.c', 'pw')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects wrong password', async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce(userRow);
    jest.spyOn(pw, 'verifyPassword').mockResolvedValueOnce(false);
    await expect(svc.login('a@b.c', 'pw')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('AuthService.refresh', () => {
  beforeEach(() => { mockReset(prisma); mockReset(jwt); });

  it('rotates a valid refresh token', async () => {
    jwt.verifyAsync.mockResolvedValueOnce({ sub: 'u1', jti: 'x' });
    (prisma.refreshToken as any).findUnique.mockResolvedValueOnce({
      id: 'rt1', userId: 'u1', tokenHash: sha256('old'), expiresAt: new Date(Date.now() + 1e6),
      revokedAt: null,
    });
    (prisma.refreshToken as any).update.mockResolvedValueOnce({});
    (prisma.user as any).findUnique.mockResolvedValueOnce(userRow);
    jwt.signAsync.mockResolvedValueOnce('access2').mockResolvedValueOnce('refresh2');
    (prisma.refreshToken as any).create.mockResolvedValueOnce({});

    const out = await svc.refresh('old');
    expect(out.accessToken).toBe('access2');
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ revokedAt: expect.any(Date) }) }),
    );
  });

  it('rejects a revoked token', async () => {
    jwt.verifyAsync.mockResolvedValueOnce({ sub: 'u1', jti: 'x' });
    (prisma.refreshToken as any).findUnique.mockResolvedValueOnce({
      id: 'rt1', userId: 'u1', tokenHash: sha256('old'),
      expiresAt: new Date(Date.now() + 1e6), revokedAt: new Date(),
    });
    await expect(svc.refresh('old')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unknown token hash', async () => {
    jwt.verifyAsync.mockResolvedValueOnce({ sub: 'u1', jti: 'x' });
    (prisma.refreshToken as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.refresh('old')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('AuthService.logout', () => {
  beforeEach(() => { mockReset(prisma); mockReset(jwt); });

  it('revokes the token if present', async () => {
    (prisma.refreshToken as any).updateMany.mockResolvedValueOnce({ count: 1 });
    await svc.logout('refresh-tok');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: sha256('refresh-tok'), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('is a no-op if no token provided', async () => {
    await svc.logout(undefined);
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });
});
