import {
  BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { ServicesService } from '../services/services.service';
import { AuthUser } from '../../common/types/auth-user';
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

  async listForUser(userId: string) {
    const rows = await this.prisma.appointment.findMany({
      where: { customerId: userId },
      include: INCLUDE,
      orderBy: { scheduledAt: 'desc' },
    });
    return rows.map(shape);
  }

  async listForSpecialist(specialistId: string, fromIso?: string, toIso?: string) {
    const rows = await this.prisma.appointment.findMany({
      where: {
        specialistId,
        ...(fromIso || toIso
          ? { scheduledAt: { gte: fromIso ? new Date(fromIso) : undefined, lt: toIso ? new Date(toIso) : undefined } }
          : {}),
      },
      include: INCLUDE,
      orderBy: { scheduledAt: 'asc' },
    });
    return rows.map(shape);
  }

  async listAdmin(status?: AppointmentStatus, fromIso?: string, toIso?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (fromIso || toIso) {
      where.scheduledAt = {
        ...(fromIso ? { gte: new Date(fromIso) } : {}),
        ...(toIso ? { lt: new Date(toIso) } : {}),
      };
    }
    const rows = await this.prisma.appointment.findMany({
      where,
      include: INCLUDE,
      orderBy: { scheduledAt: 'desc' },
    });
    return rows.map(shape);
  }

  async findById(id: string, actor: AuthUser) {
    const row = await this.prisma.appointment.findUnique({ where: { id }, include: INCLUDE });
    if (!row) throw new NotFoundException();
    const broad = actor.permissions.includes('appointments:read') || actor.permissions.includes('*');
    if (!broad) {
      const isOwner =
        (actor.role === 'customer' && row.customerId === actor.id) ||
        (actor.role === 'specialist' && row.specialistId === actor.specialistId);
      if (!isOwner) throw new ForbiddenException();
    }
    return shape(row);
  }

  async cancelByCustomer(userId: string, id: string) {
    const row = await this.prisma.appointment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    if (row.customerId !== userId) throw new ForbiddenException();
    if (row.status !== 'scheduled') throw new BadRequestException('Only scheduled appointments can be cancelled');
    const hoursUntil = (row.scheduledAt.getTime() - Date.now()) / 3600_000;
    if (hoursUntil < 24) {
      throw new HttpException(
        { code: 'CANCELLATION_DEADLINE_PASSED', message: 'Less than 24h before appointment — contact admin' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const updated = await this.prisma.appointment.update({
      where: { id }, data: { status: 'cancelled' }, include: INCLUDE,
    });
    return shape(updated);
  }

  async adminUpdateStatus(id: string, next: AppointmentStatus) {
    const row = await this.prisma.appointment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    if (!isValidAppointmentTransition(row.status, next)) {
      throw new BadRequestException(`Invalid transition ${row.status} → ${next}`);
    }
    const updated = await this.prisma.appointment.update({
      where: { id }, data: { status: next }, include: INCLUDE,
    });
    return shape(updated);
  }
}

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show:   [],
};

export function isValidAppointmentTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
