import { mockDeep, mockReset } from 'jest-mock-extended';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ServicesService } from './services.service';

const prisma = mockDeep<PrismaService>();
const svc = new ServicesService(prisma);

describe('ServicesService', () => {
  beforeEach(() => mockReset(prisma));

  it('lists published services to the public', async () => {
    (prisma.service as any).findMany.mockResolvedValueOnce([{
      id: 's1', name: 'Cejas', slug: 'cejas', description: null,
      durationMinutes: 45, priceCop: 50000, status: 'published',
      createdAt: new Date(), updatedAt: new Date(),
    }]);
    await svc.findPublic();
    const call = (prisma.service.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.status).toBe('published');
  });

  it('admin list includes all statuses', async () => {
    (prisma.service as any).findMany.mockResolvedValueOnce([]);
    await svc.findAdmin();
    const call = (prisma.service.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({});
  });

  it('throws 409 on duplicate slug', async () => {
    (prisma.service as any).create.mockRejectedValueOnce(
      Object.assign(new Error(), { code: 'P2002' }),
    );
    await expect(svc.create({
      name: 'X', slug: 'x', durationMinutes: 30, priceCop: 1, status: 'draft' as any,
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws 404 on update missing', async () => {
    (prisma.service as any).update.mockRejectedValueOnce(
      Object.assign(new Error(), { code: 'P2025' }),
    );
    await expect(svc.update('x', { name: 'Y' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
