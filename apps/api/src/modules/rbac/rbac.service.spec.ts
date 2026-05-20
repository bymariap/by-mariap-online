import { mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from './rbac.service';

const prisma = mockDeep<PrismaService>();
const svc = new RbacService(prisma);

describe('RbacService', () => {
  beforeEach(() => mockReset(prisma));

  it('lists roles with permissions', async () => {
    (prisma.role as any).findMany.mockResolvedValueOnce([
      { id: 'r1', name: 'admin', description: null,
        permissions: [{ permission: { key: '*' } }] },
    ]);
    const out = await svc.listRoles();
    expect(out[0].permissions).toEqual(['*']);
  });

  it('creates a role', async () => {
    (prisma.role as any).create.mockResolvedValueOnce({
      id: 'r2', name: 'finance', description: null, permissions: [],
    });
    const out = await svc.createRole({ name: 'finance' });
    expect(out.name).toBe('finance');
  });

  it('assigns permissions by key (creates missing rows)', async () => {
    (prisma.role as any).findUnique.mockResolvedValueOnce({ id: 'r1', name: 'finance' });
    (prisma.permission as any).findMany.mockResolvedValueOnce([
      { id: 'p1', key: 'orders:read' },
    ]);
    (prisma.rolePermission as any).deleteMany.mockResolvedValueOnce({});
    (prisma.rolePermission as any).createMany.mockResolvedValueOnce({ count: 1 });

    await svc.assignPermissions('r1', ['orders:read']);
    expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'r1' } });
    expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
      data: [{ roleId: 'r1', permissionId: 'p1' }],
    });
  });

  it('throws if role missing on assign', async () => {
    (prisma.role as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.assignPermissions('x', [])).rejects.toBeInstanceOf(NotFoundException);
  });
});
