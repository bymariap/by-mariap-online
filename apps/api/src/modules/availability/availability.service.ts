import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PublishAvailabilityDto } from './dto/publish-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService, private services?: any) {}

  async publish(specialistId: string, dto: PublishAvailabilityDto) {
    if (dto.startMinute >= dto.endMinute) {
      throw new BadRequestException('startMinute must be < endMinute');
    }
    return this.prisma.specialistAvailability.create({
      data: {
        specialistId,
        date: new Date(`${dto.date}T00:00:00.000Z`),
        startMinute: dto.startMinute,
        endMinute: dto.endMinute,
      },
    });
  }

  async listForSpecialist(specialistId: string, fromDate: string, toDate: string) {
    return this.prisma.specialistAvailability.findMany({
      where: {
        specialistId,
        date: {
          gte: new Date(`${fromDate}T00:00:00.000Z`),
          lte: new Date(`${toDate}T00:00:00.000Z`),
        },
      },
      orderBy: [{ date: 'asc' }, { startMinute: 'asc' }],
    });
  }

  async remove(specialistId: string, id: string) {
    const row = await this.prisma.specialistAvailability.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    if (row.specialistId !== specialistId) throw new ForbiddenException();
    await this.prisma.specialistAvailability.delete({ where: { id } });
  }
}
