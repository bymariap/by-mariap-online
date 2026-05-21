import { mockDeep, mockReset } from "jest-mock-extended";
import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ShippingService } from "./shipping.service";

const prisma = mockDeep<PrismaService>();
const svc = new ShippingService(prisma);

describe("ShippingService", () => {
  beforeEach(() => mockReset(prisma));

  it("lists pickup + zones matching the city (case-insensitive)", async () => {
    (prisma.shippingZone as any).findMany.mockResolvedValueOnce([
      {
        id: "z1",
        name: "Medellín AM",
        cities: ["Medellín", "Envigado"],
        priceCop: 10000,
        isPickup: false,
      },
      {
        id: "p1",
        name: "Recogida en tienda",
        cities: [],
        priceCop: 0,
        isPickup: true,
      },
    ]);
    const out = await svc.findOptionsByCity("medellín");
    expect(out.map((o) => o.id).sort()).toEqual(["p1", "z1"]);
  });

  it("returns only pickup when city has no zone", async () => {
    (prisma.shippingZone as any).findMany.mockResolvedValueOnce([
      {
        id: "z1",
        name: "Medellín AM",
        cities: ["Medellín"],
        priceCop: 10000,
        isPickup: false,
      },
      {
        id: "p1",
        name: "Recogida en tienda",
        cities: [],
        priceCop: 0,
        isPickup: true,
      },
    ]);
    const out = await svc.findOptionsByCity("Cali");
    expect(out.map((o) => o.id)).toEqual(["p1"]);
  });

  it("findById throws 404 when missing", async () => {
    (prisma.shippingZone as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.findById("x")).rejects.toBeInstanceOf(NotFoundException);
  });
});
