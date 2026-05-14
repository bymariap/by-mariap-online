import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { hashPassword } from '../../common/crypto/password';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }, include: { role: true },
    });
    if (!user) throw new NotFoundException();
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { fullName: dto.fullName, phone: dto.phone },
      include: { role: true },
    });
    const { passwordHash, ...safe } = updated;
    return safe;
  }

  async findAll() {
    const rows = await this.prisma.user.findMany({ include: { role: true } });
    return rows.map(({ passwordHash, ...u }) => u);
  }

  async findById(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!u) throw new NotFoundException();
    const { passwordHash, ...safe } = u;
    return safe;
  }

  async create(dto: CreateUserDto) {
    const u = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: await hashPassword(dto.password),
        fullName: dto.fullName,
        phone: dto.phone,
        roleId: dto.roleId,
      },
      include: { role: true },
    });
    const { passwordHash, ...safe } = u;
    return safe;
  }

  async update(id: string, dto: UpdateUserDto) {
    const u = await this.prisma.user.update({
      where: { id },
      data: { fullName: dto.fullName, phone: dto.phone, roleId: dto.roleId },
      include: { role: true },
    });
    const { passwordHash, ...safe } = u;
    return safe;
  }

  async remove(id: string) {
    await this.prisma.user.delete({ where: { id } });
  }
}
