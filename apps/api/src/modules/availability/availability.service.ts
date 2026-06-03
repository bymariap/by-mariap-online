import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PublishAvailabilityDto } from './dto/publish-availability.dto';
import { generateSlots } from './slot-generator';
import { ServicesService } from '../services/services.service';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService, private services: ServicesService) {}

  // Resolves the specialist profile id from the user id (source of truth in DB),
  // so it works even if the JWT was issued before the profile was assigned.
  async resolveSpecialistId(userId: string): Promise<string> {
    const sp = await this.prisma.specialist.findUnique({ where: { userId } });
    if (!sp) throw new BadRequestException('User is not a specialist');
    return sp.id;
  }

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

  async removeAny(id: string) {
    const row = await this.prisma.specialistAvailability.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    await this.prisma.specialistAvailability.delete({ where: { id } });
  }

  async getSlots(input: { serviceId: string; specialistId: string; date: string }) {
    const service = await this.services!.findById(input.serviceId);

    const windows = await this.prisma.specialistAvailability.findMany({
      where: {
        specialistId: input.specialistId,
        date: new Date(`${input.date}T00:00:00.000Z`),
      },
    });

    const BOGOTA = 'America/Bogota';
    // Local Bogota date YYYY-MM-DD spans UTC [date+05:00, date+05:00+24h).
    const dayStartUtc = fromZonedTime(`${input.date}T00:00:00`, BOGOTA);
    const dayEndUtc   = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000);

    const busyAppointments = await this.prisma.appointment.findMany({
      where: {
        specialistId: input.specialistId,
        status: 'scheduled',
        scheduledAt: { gte: dayStartUtc, lt: dayEndUtc },
      },
      select: { scheduledAt: true, durationMinutes: true },
    });

    const busy = busyAppointments.map((a) => {
      const localMinutes = utcInstantToLocalMinutes(a.scheduledAt, BOGOTA);
      return { startMinute: localMinutes, endMinute: localMinutes + a.durationMinutes };
    });

    const slots = generateSlots({
      windows: windows.map((w) => ({ startMinute: w.startMinute, endMinute: w.endMinute })),
      busy,
      durationMinutes: service.durationMinutes,
    });

    return slots.map((s) => {
      const utc = fromZonedTime(
        `${input.date}T${pad(Math.floor(s.startMinute / 60))}:${pad(s.startMinute % 60)}:00`,
        BOGOTA,
      );
      return {
        startAt: utc.toISOString(),
        localTime: formatInTimeZone(utc, BOGOTA, 'HH:mm'),
      };
    });
  }
}

function pad(n: number): string { return String(n).padStart(2, '0'); }

function utcInstantToLocalMinutes(utc: Date, tz: string): number {
  const hh = Number(formatInTimeZone(utc, tz, 'HH'));
  const mm = Number(formatInTimeZone(utc, tz, 'mm'));
  return hh * 60 + mm;
}
