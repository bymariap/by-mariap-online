import { mockDeep, mockReset } from 'jest-mock-extended';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
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
