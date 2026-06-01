import { mockDeep, mockReset } from 'jest-mock-extended';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from './availability.service';

const prisma = mockDeep<PrismaService>();
const svc = new AvailabilityService(prisma);

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
