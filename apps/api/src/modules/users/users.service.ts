import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

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
}
