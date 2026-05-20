import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpsertSpecialistDto } from "./dto/upsert-specialist.dto";

@Injectable()
export class SpecialistsService {
  constructor(private prisma: PrismaService) {}

  async upsert(userId: string, dto: UpsertSpecialistDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) throw new NotFoundException();
    if (user.role.name !== "specialist") {
      throw new BadRequestException(
        'User role must be "specialist" to assign a specialist profile',
      );
    }
    return this.prisma.specialist.upsert({
      where: { userId },
      create: {
        userId,
        bio: dto.bio,
        specialties: dto.specialties ?? [],
        avatarUrl: dto.avatarUrl,
      },
      update: {
        bio: dto.bio,
        specialties: dto.specialties,
        avatarUrl: dto.avatarUrl,
      },
    });
  }

  async findAll() {
    return this.prisma.specialist.findMany({
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { user: { fullName: "asc" } },
    });
  }

  async findByUserId(userId: string) {
    const s = await this.prisma.specialist.findUnique({
      where: { userId },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    if (!s) throw new NotFoundException();
    return s;
  }

  async remove(userId: string) {
    await this.prisma.specialist.delete({ where: { userId } });
  }
}
