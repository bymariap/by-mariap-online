import { mockDeep, mockReset } from 'jest-mock-extended';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
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
