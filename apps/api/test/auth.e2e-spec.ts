import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { execSync } from 'child_process';
import path from 'path';
import { AppModule } from '../src/app.module';
import { startTestDb } from './helpers/db';

describe('Auth E2E', () => {
  let app: INestApplication;
  let stopDb: () => Promise<void>;

  beforeAll(async () => {
    const db = await startTestDb();
    stopDb = db.stop;
    process.env.JWT_ACCESS_SECRET = 'test-access';
    process.env.JWT_REFRESH_SECRET = 'test-refresh';
    process.env.SEED_ADMIN_EMAIL = 'admin@bymariap.com';
    process.env.SEED_ADMIN_PASSWORD = 'admin-pass-123';

    const apiDir = path.resolve(__dirname, '..');
    execSync('pnpm exec ts-node prisma/seed.ts', {
      stdio: 'inherit',
      env: process.env,
      cwd: apiDir,
    });

    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await stopDb();
  });

  it('rejects /me without cookie', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
  });

  it('logs in and accesses /me', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@bymariap.com', password: 'admin-pass-123' })
      .expect(201);

    const cookies = login.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true);

    const me = await request(app.getHttpServer())
      .get('/me')
      .set('Cookie', cookies)
      .expect(200);
    expect(me.body.email).toBe('admin@bymariap.com');
  });

  it('admin can list users', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@bymariap.com', password: 'admin-pass-123' });
    const cookies = login.headers['set-cookie'] as unknown as string[];
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Cookie', cookies)
      .expect(200);
  });

  it('refresh rotates the token', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@bymariap.com', password: 'admin-pass-123' });
    const cookies = login.headers['set-cookie'] as unknown as string[];
    const refresh = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookies)
      .expect(201);
    expect(refresh.headers['set-cookie']).toBeDefined();
  });
});
