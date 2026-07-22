import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import request from "supertest";
import { execSync } from "child_process";
import path from "path";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { AppModule } from "../src/app.module";
import { StorageService } from "../src/modules/storage/storage.service";
import { startTestDb } from "./helpers/db";

describe("Uploads E2E", () => {
  let app: INestApplication;
  let stopDb: () => Promise<void>;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const db = await startTestDb();
    stopDb = db.stop;
    process.env.JWT_ACCESS_SECRET = "test-access";
    process.env.JWT_REFRESH_SECRET = "test-refresh";
    process.env.SEED_ADMIN_EMAIL = "admin@bymariap.com";
    process.env.SEED_ADMIN_PASSWORD = "admin-pass-123";

    const apiDir = path.resolve(__dirname, "..");
    execSync("pnpm exec ts-node prisma/seed.ts", {
      stdio: "inherit",
      env: process.env,
      cwd: apiDir,
    });

    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(StorageService)
      .useValue({
        store: jest
          .fn()
          .mockResolvedValue("https://cdn.bymariap.com/products/fake.jpg"),
      })
      .compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = new PrismaClient();
    const customerRole = await prisma.role.findUniqueOrThrow({
      where: { name: "customer" },
    });
    await prisma.user.create({
      data: {
        email: "customer@bymariap.com",
        passwordHash: await bcrypt.hash("customer-pass-123", 12),
        fullName: "Cliente Test",
        roleId: customerRole.id,
      },
    });
  }, 120_000);

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
    await stopDb();
  });

  async function adminCookies(): Promise<string[]> {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin@bymariap.com", password: "admin-pass-123" })
      .expect(201);
    return login.headers["set-cookie"] as unknown as string[];
  }

  async function customerCookies(): Promise<string[]> {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "customer@bymariap.com", password: "customer-pass-123" })
      .expect(201);
    return login.headers["set-cookie"] as unknown as string[];
  }

  it("rejects upload without a session", async () => {
    await request(app.getHttpServer())
      .post("/admin/uploads")
      .attach("file", Buffer.from("x"), {
        filename: "a.jpg",
        contentType: "image/jpeg",
      })
      .field("folder", "products")
      .expect(401);
  });

  it("uploads a valid image and returns a url", async () => {
    const cookies = await adminCookies();
    // Real JPEG magic bytes so the built-in FileTypeValidator (which sniffs
    // the file's actual content, not just the mimetype header) accepts it.
    const jpegBytes = Buffer.from(
      "/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAEAAQDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABgj/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABykX//Z",
      "base64",
    );
    const res = await request(app.getHttpServer())
      .post("/admin/uploads")
      .set("Cookie", cookies)
      .attach("file", jpegBytes, {
        filename: "a.jpg",
        contentType: "image/jpeg",
      })
      .field("folder", "products")
      .expect(201);
    expect(res.body.url).toBe("https://cdn.bymariap.com/products/fake.jpg");
  });

  it("rejects a file larger than 8MB (multer-level early rejection)", async () => {
    // Now that FileInterceptor's own limit matches MAX_SIZE (8MB), this 9MB
    // file is rejected by multer itself before it is fully buffered, rather
    // than by the MaxFileSizeValidator afterward. Same expected 400 outcome.
    const cookies = await adminCookies();
    await request(app.getHttpServer())
      .post("/admin/uploads")
      .set("Cookie", cookies)
      .attach("file", Buffer.alloc(9 * 1024 * 1024, 1), {
        filename: "big.jpg",
        contentType: "image/jpeg",
      })
      .field("folder", "products")
      .expect(400);
  });

  it("rejects upload from an authenticated user without media:write", async () => {
    const cookies = await customerCookies();
    const jpegBytes = Buffer.from(
      "/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAEAAQDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABgj/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABykX//Z",
      "base64",
    );
    await request(app.getHttpServer())
      .post("/admin/uploads")
      .set("Cookie", cookies)
      .attach("file", jpegBytes, {
        filename: "a.jpg",
        contentType: "image/jpeg",
      })
      .field("folder", "products")
      .expect(403);
  });
});
