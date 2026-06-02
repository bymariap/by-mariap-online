import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { startTestDb } from './helpers/db';

describe('Availability slots E2E', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let stopDb: () => Promise<void>;
  let specialistId: string;
  let serviceId: string;

  beforeAll(async () => {
    const db = await startTestDb();
    stopDb = db.stop;
    process.env.JWT_ACCESS_SECRET = 'a'; process.env.JWT_REFRESH_SECRET = 'r';
    process.env.SEED_ADMIN_EMAIL = 'admin@bymariap.com';
    process.env.SEED_ADMIN_PASSWORD = 'admin-pass-123';
    execSync('pnpm prisma:seed', { stdio: 'inherit', env: process.env, cwd: __dirname + '/..' });

    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = new PrismaClient();

    // Set up a specialist user + service
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'specialist' } });
    const user = await prisma.user.create({
      data: {
        email: 'spec@bymariap.com',
        passwordHash: '$2b$12$0123456789012345678901C/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        fullName: 'Especialista Test',
        roleId: role.id,
      },
    });
    const spec = await prisma.specialist.create({ data: { userId: user.id } });
    specialistId = spec.id;

    const svc = await prisma.service.create({
      data: { name: 'Cejas', slug: 'cejas', durationMinutes: 45, priceCop: 50000, status: 'published' },
    });
    serviceId = svc.id;

    // Availability: morning 09:00-12:00, afternoon 14:00-18:00 on 2026-06-01 (Bogota date)
    await prisma.specialistAvailability.createMany({
      data: [
        { specialistId, date: new Date('2026-06-01T00:00:00.000Z'), startMinute: 540, endMinute: 720 },
        { specialistId, date: new Date('2026-06-01T00:00:00.000Z'), startMinute: 840, endMinute: 1080 },
      ],
    });
  }, 240_000);

  afterAll(async () => { await prisma.$disconnect(); await app.close(); await stopDb(); });

  it('returns 09:00, 09:30, 10:00, 10:30, 11:00 + afternoon slots when day is empty', async () => {
    const res = await request(app.getHttpServer())
      .get(`/store/availability?serviceId=${serviceId}&specialistId=${specialistId}&date=2026-06-01`)
      .expect(200);
    const local = (res.body as { localTime: string }[]).map((s) => s.localTime);
    expect(local).toEqual([
      '09:00', '09:30', '10:00', '10:30', '11:00',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
    ]);
  });

  it('after booking 10:00, that slot and overlapping 09:30 / 10:30 disappear', async () => {
    // Book 10:00 Bogota = 15:00 UTC
    await prisma.appointment.create({
      data: {
        customerId: null, guestEmail: 'g@g.c', guestPhone: '3001112222', guestFullName: 'Guest',
        specialistId, serviceId,
        scheduledAt: new Date('2026-06-01T15:00:00.000Z'),
        durationMinutes: 45, status: 'scheduled',
      },
    });

    const res = await request(app.getHttpServer())
      .get(`/store/availability?serviceId=${serviceId}&specialistId=${specialistId}&date=2026-06-01`)
      .expect(200);
    const local = (res.body as { localTime: string }[]).map((s) => s.localTime);
    expect(local).not.toContain('09:30');
    expect(local).not.toContain('10:00');
    expect(local).not.toContain('10:30');
    expect(local).toContain('09:00');
    expect(local).toContain('11:00');
  });

  it('day with no availability returns []', async () => {
    const res = await request(app.getHttpServer())
      .get(`/store/availability?serviceId=${serviceId}&specialistId=${specialistId}&date=2026-06-02`)
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it('POST /store/appointments succeeds, second one to same slot is 409 SLOT_TAKEN', async () => {
    const startAt = new Date('2026-06-01T19:00:00.000Z').toISOString(); // 14:00 Bogota
    const payload = {
      serviceId, specialistId, startAt,
      guestEmail: 'a@b.com', guestPhone: '3001112222', guestFullName: 'Ana',
    };
    await request(app.getHttpServer()).post('/store/appointments').send(payload).expect(201);
    const second = await request(app.getHttpServer()).post('/store/appointments').send(payload).expect(409);
    expect(second.body.code).toBe('SLOT_TAKEN');
  });
});
