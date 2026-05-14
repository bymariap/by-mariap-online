import { mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

const prisma = mockDeep<PrismaService>();
const svc = new UsersService(prisma);

describe('UsersService.findMe', () => {
  beforeEach(() => mockReset(prisma));

  it('returns the current user without password hash', async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.c', fullName: 'A', phone: null,
      passwordHash: 'h', roleId: 'r1', role: { name: 'admin' },
      createdAt: new Date(), updatedAt: new Date(),
    });
    const out = await svc.findMe('u1');
    expect(out).not.toHaveProperty('passwordHash');
    expect(out.email).toBe('a@b.c');
  });

  it('throws 404 if user gone', async () => {
    (prisma.user as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.findMe('u1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('UsersService.updateMe', () => {
  beforeEach(() => mockReset(prisma));

  it('updates fullName and phone only', async () => {
    (prisma.user as any).update.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.c', fullName: 'New', phone: '300',
      passwordHash: 'h', roleId: 'r1', role: { name: 'admin' },
      createdAt: new Date(), updatedAt: new Date(),
    });
    const out = await svc.updateMe('u1', { fullName: 'New', phone: '300' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { fullName: 'New', phone: '300' },
      include: { role: true },
    });
    expect(out.fullName).toBe('New');
  });
});
