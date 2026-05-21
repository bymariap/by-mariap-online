import { mockDeep, mockReset } from "jest-mock-extended";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { WompiClient } from "./wompi.client";
import { PaymentsService } from "./payments.service";

const prisma = mockDeep<PrismaService>();
const wompi = mockDeep<WompiClient>();
const svc = new PaymentsService(prisma, wompi);

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
