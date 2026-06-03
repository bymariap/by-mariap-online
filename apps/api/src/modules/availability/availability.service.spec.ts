import { mockDeep, mockReset } from 'jest-mock-extended';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from './availability.service';
import { ServicesService } from '../services/services.service';

const prisma = mockDeep<PrismaService>();
const servicesStub = mockDeep<ServicesService>();
const svc = new AvailabilityService(prisma, servicesStub);

describe('AvailabilityService.resolveSpecialistId', () => {
  beforeEach(() => mockReset(prisma));

  it('returns the specialist id for a user with a profile', async () => {
    (prisma.specialist as any).findUnique.mockResolvedValueOnce({ id: 's1', userId: 'u1' });
    await expect(svc.resolveSpecialistId('u1')).resolves.toBe('s1');
  });

  it('throws when the user has no specialist profile', async () => {
    (prisma.specialist as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.resolveSpecialistId('u1')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AvailabilityService.publish', () => {
  beforeEach(() => mockReset(prisma));

  it('creates a window for the specialist', async () => {
    (prisma.specialistAvailability as any).create.mockResolvedValueOnce({
      id: 'a1', specialistId: 's1', date: new Date('2026-06-01'),
      startMinute: 540, endMinute: 720, createdAt: new Date(),
    });
    const out = await svc.publish('s1', {
      date: '2026-06-01', startMinute: 540, endMinute: 720,
    });
    expect(out.id).toBe('a1');
  });

  it('rejects when start >= end', async () => {
    await expect(svc.publish('s1', {
      date: '2026-06-01', startMinute: 720, endMinute: 540,
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AvailabilityService.remove', () => {
  beforeEach(() => mockReset(prisma));

  it('only allows removing your own windows', async () => {
    (prisma.specialistAvailability as any).findUnique.mockResolvedValueOnce({
      id: 'a1', specialistId: 's2',
    });
    await expect(svc.remove('s1', 'a1')).rejects.toMatchObject({ status: 403 });
  });

  it('throws 404 when missing', async () => {
    (prisma.specialistAvailability as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.remove('s1', 'a1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AvailabilityService.getSlots', () => {
  const services = mockDeep<ServicesService>();
  const svc2 = new AvailabilityService(prisma, services);

  beforeEach(() => { mockReset(prisma); mockReset(services); });

  it('returns slot UTC instants for the day, excluding busy', async () => {
    services.findById.mockResolvedValueOnce({
      id: 'svc1', name: 'Cejas', slug: 'cejas', description: null,
      durationMinutes: 45, priceCop: 50000, status: 'published',
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    (prisma.specialistAvailability as any).findMany.mockResolvedValueOnce([
      {
        id: 'a1', specialistId: 's1',
        date: new Date('2026-06-01T00:00:00.000Z'),
        startMinute: 540, endMinute: 720, createdAt: new Date(),
      },
    ]);
    // existing scheduled appointment 10:00-10:45 local (Bogota = UTC-5),
    // so scheduledAt UTC = 2026-06-01T15:00:00Z
    (prisma.appointment as any).findMany.mockResolvedValueOnce([
      { scheduledAt: new Date('2026-06-01T15:00:00.000Z'), durationMinutes: 45 },
    ]);

    const slots = await svc2.getSlots({
      serviceId: 'svc1', specialistId: 's1', date: '2026-06-01',
    });

    // Local times: 09:00, 11:00 (09:30, 10:00, 10:30 all overlap with busy 10:00-10:45 using full interval check)
    expect(slots.map((s) => s.localTime)).toEqual(['09:00', '11:00']);
    expect(slots[0].startAt).toBe(new Date('2026-06-01T14:00:00.000Z').toISOString());
  });

  it('returns [] when no availability for that date', async () => {
    services.findById.mockResolvedValueOnce({
      id: 'svc1', durationMinutes: 45, priceCop: 50000, name: 'X', slug: 'x',
      description: null, status: 'published',
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    (prisma.specialistAvailability as any).findMany.mockResolvedValueOnce([]);
    (prisma.appointment as any).findMany.mockResolvedValueOnce([]);
    const slots = await svc2.getSlots({
      serviceId: 'svc1', specialistId: 's1', date: '2026-06-01',
    });
    expect(slots).toEqual([]);
  });
});

describe('AvailabilityService.removeAny', () => {
  beforeEach(() => mockReset(prisma));

  it('deletes any window without an ownership check', async () => {
    (prisma.specialistAvailability as any).findUnique.mockResolvedValueOnce({
      id: 'a1', specialistId: 's2',
    });
    (prisma.specialistAvailability as any).delete.mockResolvedValueOnce({ id: 'a1' });
    await svc.removeAny('a1');
    expect(prisma.specialistAvailability.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
  });

  it('throws 404 when the window does not exist', async () => {
    (prisma.specialistAvailability as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.removeAny('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
