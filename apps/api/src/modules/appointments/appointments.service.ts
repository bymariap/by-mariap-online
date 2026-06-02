import {
  BadRequestException, HttpException, HttpStatus, Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { ServicesService } from '../services/services.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

const INCLUDE = {
  specialist: { include: { user: { select: { fullName: true } } } },
  service: { select: { name: true } },
};

function shape(a: any) {
  return {
    id: a.id,
    customerId: a.customerId,
    guestEmail: a.guestEmail,
    guestPhone: a.guestPhone,
    guestFullName: a.guestFullName,
    specialistId: a.specialistId,
    specialistName: a.specialist?.user?.fullName ?? '',
    serviceId: a.serviceId,
    serviceName: a.service?.name ?? '',
    scheduledAt: a.scheduledAt instanceof Date ? a.scheduledAt.toISOString() : a.scheduledAt,
    durationMinutes: a.durationMinutes,
    status: a.status,
    notes: a.notes,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  };
}

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private availability: AvailabilityService,
    private services: ServicesService,
  ) {}

  async create(actor: { userId: string | null }, dto: CreateAppointmentDto) {
    const service = await this.services.findById(dto.serviceId);

    if (!actor.userId) {
      if (!dto.guestEmail || !dto.guestPhone || !dto.guestFullName) {
        throw new BadRequestException('guestEmail, guestPhone, guestFullName required');
      }
    }

    // Re-check availability at booking time. Race with the unique constraint catches the rest.
    const dateYmd = dto.startAt.slice(0, 10);
    const slots = await this.availability.getSlots({
      serviceId: dto.serviceId,
      specialistId: dto.specialistId,
      date: dateYmd,
    });
    const wanted = new Date(dto.startAt).toISOString();
    const isFree = slots.some((s) => s.startAt === wanted);
    if (!isFree) {
      throw new HttpException(
        { code: 'SLOT_TAKEN', message: 'That slot is no longer available' },
        HttpStatus.CONFLICT,
      );
    }

    try {
      const row = await this.prisma.appointment.create({
        data: {
          customerId: actor.userId,
          guestEmail: actor.userId ? null : dto.guestEmail!,
          guestPhone: actor.userId ? null : dto.guestPhone!,
          guestFullName: actor.userId ? null : dto.guestFullName!,
          specialistId: dto.specialistId,
          serviceId: dto.serviceId,
          scheduledAt: new Date(dto.startAt),
          durationMinutes: service.durationMinutes,
          status: 'scheduled',
          notes: dto.notes,
        },
        include: INCLUDE,
      });
      return shape(row);
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new HttpException(
          { code: 'SLOT_TAKEN', message: 'That slot was just booked' },
          HttpStatus.CONFLICT,
        );
      }
      throw e;
    }
  }
}
