import { mockDeep, mockReset } from 'jest-mock-extended';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriesService } from './categories.service';

const prisma = mockDeep<PrismaService>();
const svc = new CategoriesService(prisma);

describe('CategoriesService', () => {
  beforeEach(() => mockReset(prisma));

  it('lists categories alphabetically', async () => {
    (prisma.category as any).findMany.mockResolvedValueOnce([
      { id: 'c1', name: 'Aceites', slug: 'aceites', createdAt: new Date(), updatedAt: new Date() },
    ]);
    const out = await svc.findAll();
    expect(out[0].slug).toBe('aceites');
    expect((prisma.category.findMany as jest.Mock).mock.calls[0][0]).toEqual({
      orderBy: { name: 'asc' },
    });
  });

  it('creates a category', async () => {
    (prisma.category as any).create.mockResolvedValueOnce({
      id: 'c2', name: 'Cejas', slug: 'cejas', createdAt: new Date(), updatedAt: new Date(),
    });
    const out = await svc.create({ name: 'Cejas', slug: 'cejas' });
    expect(out.id).toBe('c2');
  });

  it('throws 409 on duplicate slug', async () => {
    (prisma.category as any).create.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    );
    await expect(svc.create({ name: 'X', slug: 'x' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws 404 on update missing', async () => {
    (prisma.category as any).update.mockRejectedValueOnce(
      Object.assign(new Error('not found'), { code: 'P2025' }),
    );
    await expect(svc.update('x', { name: 'Y' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
