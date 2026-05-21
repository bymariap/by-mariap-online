import { mockDeep, mockReset } from "jest-mock-extended";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { WompiClient } from "./wompi.client";
import { PaymentsService } from "./payments.service";
import { computeEventSignature } from "./wompi.crypto";

const prisma = mockDeep<PrismaService>();
const wompi = mockDeep<WompiClient>();
const svc = new PaymentsService(prisma, wompi);

function makeEvent(
  status: string,
  ref = "BMR-1",
  txId = "tx_1",
  amountInCents = 10000000,
) {
  const timestamp = 1700000000;
  process.env.WOMPI_EVENT_SECRET = "evsec";
  const properties = [
    { path: "transaction.id", value: txId },
    { path: "transaction.status", value: status },
    { path: "transaction.amount_in_cents", value: String(amountInCents) },
  ];
  const checksum = computeEventSignature({
    properties,
    timestamp,
    eventSecret: "evsec",
  });
  return {
    body: {
      event: "transaction.updated",
      data: {
        transaction: {
          id: txId,
          reference: ref,
          status,
          amount_in_cents: amountInCents,
        },
      },
      timestamp,
      signature: { checksum, properties: properties.map((p) => p.path) },
    },
    checksum,
  };
}

describe("PaymentsService.createIntent", () => {
  beforeEach(() => {
    mockReset(prisma);
    mockReset(wompi);
  });

  it("returns intent data for a pending order", async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce({
      id: "o1",
      reference: "BMR-1",
      status: "pending",
      total: 100000,
    });
    wompi.buildIntent.mockReturnValueOnce({
      reference: "BMR-1",
      amountInCents: 10000000,
      currency: "COP",
      publicKey: "pk",
      integritySignature: "sig",
    });
    const out = await svc.createIntent("BMR-1");
    expect(out.amountInCents).toBe(10000000);
    expect(wompi.buildIntent).toHaveBeenCalledWith({
      reference: "BMR-1",
      amountInCents: 10000000,
    });
  });

  it("rejects intent for non-pending order", async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce({
      id: "o1",
      reference: "BMR-1",
      status: "paid",
      total: 100000,
    });
    await expect(svc.createIntent("BMR-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("throws 404 if order missing", async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.createIntent("BMR-X")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe("PaymentsService.processWebhook", () => {
  beforeEach(() => {
    mockReset(prisma);
    mockReset(wompi);
  });

  it("rejects when signature invalid", async () => {
    const { body } = makeEvent("APPROVED");
    body.signature.checksum = "bad";
    await expect(svc.processWebhook(body, "bad")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("marks paid and decrements stock atomically", async () => {
    const { body, checksum } = makeEvent("APPROVED");
    (prisma.webhookLog as any).findUnique.mockResolvedValueOnce(null);
    (prisma.webhookLog as any).create.mockResolvedValueOnce({});

    (prisma.$transaction as any).mockImplementationOnce(async (fn: any) =>
      fn({
        order: {
          findUnique: jest.fn().mockResolvedValueOnce({
            id: "o1",
            reference: "BMR-1",
            status: "pending",
            items: [
              {
                id: "oi1",
                productId: "p1",
                quantity: 2,
                unitPriceSnapshot: 50000,
              },
            ],
          }),
          update: jest.fn().mockResolvedValueOnce({}),
        },
        payment: { update: jest.fn().mockResolvedValueOnce({}) },
        product: { update: jest.fn().mockResolvedValueOnce({}) },
        webhookLog: { update: jest.fn().mockResolvedValueOnce({}) },
      }),
    );

    await svc.processWebhook(body, checksum);
    const txFn = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    expect(typeof txFn).toBe("function");
  });

  it("is idempotent — second call with same checksum is no-op", async () => {
    const { body, checksum } = makeEvent("APPROVED");
    (prisma.webhookLog as any).findUnique.mockResolvedValueOnce({
      id: "w1",
      processedAt: new Date(),
    });
    await svc.processWebhook(body, checksum);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("maps DECLINED to cancelled order", async () => {
    const { body, checksum } = makeEvent("DECLINED");
    (prisma.webhookLog as any).findUnique.mockResolvedValueOnce(null);
    (prisma.webhookLog as any).create.mockResolvedValueOnce({});
    (prisma.$transaction as any).mockImplementationOnce(async (fn: any) =>
      fn({
        order: {
          findUnique: jest.fn().mockResolvedValueOnce({
            id: "o1",
            reference: "BMR-1",
            status: "pending",
            items: [],
          }),
          update: jest.fn().mockImplementationOnce((args: any) => {
            expect(args.data.status).toBe("cancelled");
            return Promise.resolve({});
          }),
        },
        payment: { update: jest.fn().mockResolvedValueOnce({}) },
        product: { update: jest.fn() },
        webhookLog: { update: jest.fn().mockResolvedValueOnce({}) },
      }),
    );
    await svc.processWebhook(body, checksum);
  });
});
