import { mockDeep, mockReset } from 'jest-mock-extended';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { ServicesService } from '../services/services.service';
import { AppointmentsService } from './appointments.service';

const prisma = mockDeep<PrismaService>();
const availability = mockDeep<AvailabilityService>();
const services = mockDeep<ServicesService>();
const svc = new AppointmentsService(prisma, availability, services);

const service = {
  id: 'svc1', name: 'Cejas', slug: 'cejas', description: null,
  durationMinutes: 45, priceCop: 50000, status: 'published' as const,
  createdAt: new Date(), updatedAt: new Date(),
};

describe('AppointmentsService.create', () => {
  beforeEach(() => { mockReset(prisma); mockReset(availability); mockReset(services); });

  it('books an appointment for a logged-in customer', async () => {
    services.findById.mockResolvedValueOnce(service as any);
    availability.getSlots.mockResolvedValueOnce([
      { startAt: '2026-06-01T14:00:00.000Z', localTime: '09:00' },
    ]);
    (prisma.appointment as any).create.mockResolvedValueOnce({
      id: 'ap1', customerId: 'u1', guestEmail: null, guestPhone: null, guestFullName: null,
      specialistId: 's1', serviceId: 'svc1',
      scheduledAt: new Date('2026-06-01T14:00:00.000Z'),
      durationMinutes: 45, status: 'scheduled', notes: null,
      createdAt: new Date(),
      specialist: { user: { fullName: 'Spec' } },
      service: { name: 'Cejas' },
    });

    const out = await svc.create({ userId: 'u1' }, {
      serviceId: 'svc1', specialistId: 's1', startAt: '2026-06-01T14:00:00.000Z',
    });
    expect(out.status).toBe('scheduled');
    expect(out.durationMinutes).toBe(45);
  });

  it('rejects when slot is not in the available list (race-aware re-check)', async () => {
    services.findById.mockResolvedValueOnce(service as any);
    availability.getSlots.mockResolvedValueOnce([
      { startAt: '2026-06-01T14:30:00.000Z', localTime: '09:30' },
    ]);
    await expect(svc.create({ userId: 'u1' }, {
      serviceId: 'svc1', specialistId: 's1', startAt: '2026-06-01T14:00:00.000Z',
    })).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: 'SLOT_TAKEN' }),
    });
  });

  it('translates unique-constraint race to 409 SLOT_TAKEN', async () => {
    services.findById.mockResolvedValueOnce(service as any);
    availability.getSlots.mockResolvedValueOnce([
      { startAt: '2026-06-01T14:00:00.000Z', localTime: '09:00' },
    ]);
    (prisma.appointment as any).create.mockRejectedValueOnce(
      Object.assign(new Error(), { code: 'P2002' }),
    );
    await expect(svc.create({ userId: 'u1' }, {
      serviceId: 'svc1', specialistId: 's1', startAt: '2026-06-01T14:00:00.000Z',
    })).rejects.toMatchObject({ status: 409 });
  });

  it('guest booking requires email + phone + name', async () => {
    services.findById.mockResolvedValueOnce(service as any);
    availability.getSlots.mockResolvedValueOnce([
      { startAt: '2026-06-01T14:00:00.000Z', localTime: '09:00' },
    ]);
    await expect(svc.create({ userId: null }, {
      serviceId: 'svc1', specialistId: 's1', startAt: '2026-06-01T14:00:00.000Z',
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AppointmentsService.cancelByCustomer', () => {
  beforeEach(() => { mockReset(prisma); mockReset(availability); mockReset(services); });

  it('allows cancel when more than 24h ahead', async () => {
    const ts = new Date(Date.now() + 30 * 60 * 60 * 1000); // 30h ahead
    (prisma.appointment as any).findUnique.mockResolvedValueOnce({
      id: 'ap1', customerId: 'u1', status: 'scheduled', scheduledAt: ts,
      specialist: { user: { fullName: 'Spec' } }, service: { name: 'Cejas' },
      durationMinutes: 45, guestEmail: null, guestPhone: null, guestFullName: null,
      serviceId: 'svc1', specialistId: 's1', notes: null, createdAt: new Date(),
    });
    (prisma.appointment as any).update.mockResolvedValueOnce({
      id: 'ap1', status: 'cancelled', scheduledAt: ts, durationMinutes: 45,
      customerId: 'u1', guestEmail: null, guestPhone: null, guestFullName: null,
      serviceId: 'svc1', specialistId: 's1', notes: null, createdAt: new Date(),
      specialist: { user: { fullName: 'Spec' } }, service: { name: 'Cejas' },
    });
    const out = await svc.cancelByCustomer('u1', 'ap1');
    expect(out.status).toBe('cancelled');
  });

  it('rejects cancel within 24h with CANCELLATION_DEADLINE_PASSED', async () => {
    const ts = new Date(Date.now() + 10 * 60 * 60 * 1000); // 10h ahead
    (prisma.appointment as any).findUnique.mockResolvedValueOnce({
      id: 'ap1', customerId: 'u1', status: 'scheduled', scheduledAt: ts,
      durationMinutes: 45,
    });
    await expect(svc.cancelByCustomer('u1', 'ap1')).rejects.toMatchObject({
      status: 400,
      response: expect.objectContaining({ code: 'CANCELLATION_DEADLINE_PASSED' }),
    });
  });

  it('rejects when not the owner', async () => {
    (prisma.appointment as any).findUnique.mockResolvedValueOnce({
      id: 'ap1', customerId: 'u2', status: 'scheduled',
      scheduledAt: new Date(Date.now() + 48 * 3600 * 1000),
    });
    await expect(svc.cancelByCustomer('u1', 'ap1')).rejects.toMatchObject({ status: 403 });
  });
});

describe('AppointmentsService.adminUpdateStatus', () => {
  beforeEach(() => mockReset(prisma));

  const baseRow = (status: AppointmentStatus) => ({
    id: 'ap1', status, scheduledAt: new Date(), durationMinutes: 45,
    customerId: null, guestEmail: null, guestPhone: null, guestFullName: null,
    serviceId: 'svc1', specialistId: 's1', notes: null, createdAt: new Date(),
    specialist: { user: { fullName: 'Spec' } }, service: { name: 'Cejas' },
  });

  it('allows scheduled → completed', async () => {
    (prisma.appointment as any).findUnique.mockResolvedValueOnce(baseRow('scheduled'));
    (prisma.appointment as any).update.mockResolvedValueOnce(baseRow('completed'));
    const out = await svc.adminUpdateStatus('ap1', 'completed' as any);
    expect(out.status).toBe('completed');
  });

  it('rejects completed → scheduled', async () => {
    (prisma.appointment as any).findUnique.mockResolvedValueOnce(baseRow('completed'));
    await expect(svc.adminUpdateStatus('ap1', 'scheduled' as any)).rejects.toBeInstanceOf(Error);
  });
});

describe('AppointmentsService.listForUser', () => {
  beforeEach(() => mockReset(prisma));

  it("returns the customer's appointments ordered by scheduledAt desc", async () => {
    (prisma.appointment as any).findMany.mockResolvedValueOnce([]);
    await svc.listForUser('u1');
    const call = (prisma.appointment.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ customerId: 'u1' });
    expect(call.orderBy).toEqual({ scheduledAt: 'desc' });
  });
});

describe('AppointmentsService.listAdmin range filter', () => {
  beforeEach(() => { mockReset(prisma); mockReset(availability); mockReset(services); });

  it('filters by scheduledAt range when from/to are given', async () => {
    (prisma.appointment as any).findMany.mockResolvedValueOnce([]);
    await svc.listAdmin(undefined, '2026-06-01T00:00:00.000Z', '2026-06-08T00:00:00.000Z');
    const call = (prisma.appointment.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.scheduledAt).toEqual({
      gte: new Date('2026-06-01T00:00:00.000Z'),
      lt: new Date('2026-06-08T00:00:00.000Z'),
    });
  });

  it('combines status and range', async () => {
    (prisma.appointment as any).findMany.mockResolvedValueOnce([]);
    await svc.listAdmin('scheduled' as any, '2026-06-01T00:00:00.000Z', '2026-06-08T00:00:00.000Z');
    const call = (prisma.appointment.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.status).toBe('scheduled');
    expect(call.where.scheduledAt.gte).toEqual(new Date('2026-06-01T00:00:00.000Z'));
  });

  it('no range filter when from/to omitted', async () => {
    (prisma.appointment as any).findMany.mockResolvedValueOnce([]);
    await svc.listAdmin();
    const call = (prisma.appointment.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.scheduledAt).toBeUndefined();
  });
});
