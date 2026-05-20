import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  async listRoles() {
    const rows = await this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
    });
    return rows.map((r) => ({
      id: r.id, name: r.name, description: r.description,
      permissions: r.permissions.map((rp) => rp.permission.key),
    }));
  }

  async createRole(dto: CreateRoleDto) {
    const row = await this.prisma.role.create({
      data: { name: dto.name, description: dto.description },
      include: { permissions: true },
    });
    return { id: row.id, name: row.name, description: row.description, permissions: [] };
  }

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { key: 'asc' } });
  }

  async assignPermissions(roleId: string, permissionKeys: string[]) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException();
    const perms = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });
    if (perms.length !== permissionKeys.length) {
      const known = perms.map((p) => p.key);
      const unknown = permissionKeys.filter((k) => !known.includes(k));
      throw new BadRequestException(`Unknown permission keys: ${unknown.join(', ')}`);
    }
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    await this.prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId, permissionId: p.id })),
    });
  }
}
