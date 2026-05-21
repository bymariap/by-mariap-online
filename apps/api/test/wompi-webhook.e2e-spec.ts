import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import request from "supertest";
import { execSync } from "child_process";
import { AppModule } from "../src/app.module";
import { startTestDb } from "./helpers/db";
import { computeEventSignature } from "../src/modules/payments/wompi.crypto";
import { PrismaClient } from "@prisma/client";

describe("Wompi webhook E2E", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let stopDb: () => Promise<void>;

  beforeAll(async () => {
    const db = await startTestDb();
    stopDb = db.stop;
    process.env.JWT_ACCESS_SECRET = "test-access";
    process.env.JWT_REFRESH_SECRET = "test-refresh";
    process.env.SEED_ADMIN_EMAIL = "admin@bymariap.com";
    process.env.SEED_ADMIN_PASSWORD = "admin-pass-123";
    process.env.SEED_DEMO_DATA = "true";
    process.env.WOMPI_PUBLIC_KEY = "pub_test";
    process.env.WOMPI_INTEGRITY_SECRET = "integ_test";
    process.env.WOMPI_EVENT_SECRET = "event_test";
    // Unset COOKIE_DOMAIN so supertest (which uses 127.0.0.1) receives the
    // guest-token cookie without a Domain restriction. The .env default
    // "localhost" causes a domain mismatch and the cookie is never sent back.
    process.env.COOKIE_DOMAIN = "";
    execSync("pnpm prisma:seed", {
      stdio: "inherit",
      env: process.env,
      cwd: __dirname + "/..",
    });

    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = new PrismaClient();
  }, 180_000);

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
    await stopDb();
  });

  it("full flow: add to cart → create order → webhook APPROVED → stock decremented", async () => {
    const server = app.getHttpServer();

    const product = await prisma.product.findFirstOrThrow({
      where: { status: "published" },
    });
    const startStock = product.stockQuantity;
    const zone = await prisma.shippingZone.findFirstOrThrow({
      where: { isPickup: false },
    });

    // 1. Guest adds to cart (cookie persists across supertest calls via agent)
    const agent = request.agent(server);
    await agent
      .post("/store/cart/items")
      .send({ productId: product.id, quantity: 2 })
      .expect(201);

    // 2. Create order
    const orderRes = await agent
      .post("/store/orders")
      .send({
        shippingZoneId: zone.id,
        shippingAddress: {
          fullName: "Test",
          phone: "3001112222",
          address: "Calle 1",
          city: "Medellín",
        },
        guestEmail: "test@guest.com",
        guestPhone: "3001112222",
      })
      .expect(201);
    const reference: string = orderRes.body.reference;

    // 3. Get intent (sanity)
    await agent.get(`/store/payments/intent/${reference}`).expect(200);

    // 4. Send signed webhook
    const timestamp = Math.floor(Date.now() / 1000);
    const txId = "tx_test_1";
    const amountInCents = (product.priceCop * 2 + zone.priceCop) * 100;
    const properties = [
      { path: "transaction.id", value: txId },
      { path: "transaction.status", value: "APPROVED" },
      { path: "transaction.amount_in_cents", value: String(amountInCents) },
    ];
    const checksum = computeEventSignature({
      properties,
      timestamp,
      eventSecret: "event_test",
    });
    const body = {
      event: "transaction.updated",
      data: {
        transaction: {
          id: txId,
          reference,
          status: "APPROVED",
          amount_in_cents: amountInCents,
        },
      },
      timestamp,
      signature: { checksum, properties: properties.map((p) => p.path) },
    };

    await request(server)
      .post("/webhooks/wompi")
      .set("X-Event-Checksum", checksum)
      .send(body)
      .expect(201);

    // 5. Verify state
    const order = await prisma.order.findUniqueOrThrow({
      where: { reference },
    });
    expect(order.status).toBe("paid");

    const updated = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(updated.stockQuantity).toBe(startStock - 2);

    // 6. Idempotency — send same webhook again, stock unchanged
    await request(server)
      .post("/webhooks/wompi")
      .set("X-Event-Checksum", checksum)
      .send(body)
      .expect(201);
    const afterReplay = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(afterReplay.stockQuantity).toBe(startStock - 2);
  });

  it("webhook with invalid checksum returns 401", async () => {
    await request(app.getHttpServer())
      .post("/webhooks/wompi")
      .set("X-Event-Checksum", "wrong")
      .send({
        event: "x",
        data: { transaction: {} },
        timestamp: 0,
        signature: { checksum: "wrong", properties: [] },
      })
      .expect(401);
  });
});
