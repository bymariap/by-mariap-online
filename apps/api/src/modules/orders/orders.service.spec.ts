import { mockDeep, mockReset } from "jest-mock-extended";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CartService } from "../cart/cart.service";
import { ShippingService } from "../shipping/shipping.service";
import { OrdersService } from "./orders.service";

const prisma = mockDeep<PrismaService>();
const cart = mockDeep<CartService>();
const shipping = mockDeep<ShippingService>();
const svc = new OrdersService(prisma, cart, shipping);

const dto = {
  shippingZoneId: "z1",
  shippingAddress: {
    fullName: "Cliente",
    phone: "300",
    address: "Cl 1",
    city: "Medellín",
    notes: undefined,
  },
} as any;

describe("OrdersService.createFromCart", () => {
  beforeEach(() => {
    mockReset(prisma);
    mockReset(cart);
    mockReset(shipping);
  });

  it("creates order with snapshots, totals and shipping cost", async () => {
    cart.getForUser.mockResolvedValueOnce({
      id: "c1",
      items: [
        {
          id: "ci1",
          productId: "p1",
          productName: "X",
          productSlug: "x",
          productImageUrl: null,
          quantity: 2,
          unitPriceSnapshot: 50000,
          lineTotal: 100000,
        },
      ],
      subtotal: 100000,
    } as any);
    shipping.findById.mockResolvedValueOnce({
      id: "z1",
      name: "Z",
      cities: [],
      priceCop: 10000,
      isPickup: false,
      createdAt: new Date(),
    } as any);
    (prisma.product as any).findMany.mockResolvedValueOnce([
      { id: "p1", stockQuantity: 5, name: "X", priceCop: 50000 },
    ]);
    (prisma.$transaction as any).mockImplementationOnce(async (fn: any) =>
      fn({
        order: {
          create: jest.fn().mockResolvedValueOnce({
            id: "o1",
            reference: "BMR-…",
            status: "pending",
            customerId: "u1",
            guestEmail: null,
            guestPhone: null,
            subtotal: 100000,
            shippingCost: 10000,
            total: 110000,
            shippingAddress: dto.shippingAddress,
            shippingMethod: "Z",
            items: [
              {
                id: "oi1",
                productId: "p1",
                nameSnapshot: "X",
                quantity: 2,
                unitPriceSnapshot: 50000,
              },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        payment: { create: jest.fn().mockResolvedValueOnce({}) },
        cartItem: { deleteMany: jest.fn().mockResolvedValueOnce({}) },
      }),
    );

    const out = await svc.createFromCart(
      { userId: "u1", guestToken: null },
      dto,
    );
    expect(out.subtotal).toBe(100000);
    expect(out.shippingCost).toBe(10000);
    expect(out.total).toBe(110000);
    expect(out.status).toBe("pending");
  });

  it("rejects empty cart", async () => {
    cart.getForUser.mockResolvedValueOnce({
      id: "c1",
      items: [],
      subtotal: 0,
    } as any);
    await expect(
      svc.createFromCart({ userId: "u1", guestToken: null }, dto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects with 409 OUT_OF_STOCK when a product stock is insufficient", async () => {
    cart.getForUser.mockResolvedValueOnce({
      id: "c1",
      items: [
        {
          id: "ci1",
          productId: "p1",
          productName: "X",
          productSlug: "x",
          productImageUrl: null,
          quantity: 9,
          unitPriceSnapshot: 50000,
          lineTotal: 450000,
        },
      ],
      subtotal: 450000,
    } as any);
    shipping.findById.mockResolvedValueOnce({
      id: "z1",
      name: "Z",
      cities: [],
      priceCop: 10000,
      isPickup: false,
      createdAt: new Date(),
    } as any);
    (prisma.product as any).findMany.mockResolvedValueOnce([
      { id: "p1", stockQuantity: 5, name: "X", priceCop: 50000 },
    ]);

    await expect(
      svc.createFromCart({ userId: "u1", guestToken: null }, dto),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: "OUT_OF_STOCK" }),
    });
  });

  it("requires guest_email + guest_phone when no logged user", async () => {
    cart.getForGuest.mockResolvedValueOnce({
      id: "c1",
      items: [
        {
          id: "ci1",
          productId: "p1",
          productName: "X",
          productSlug: "x",
          productImageUrl: null,
          quantity: 1,
          unitPriceSnapshot: 50000,
          lineTotal: 50000,
        },
      ],
      subtotal: 50000,
    } as any);
    shipping.findById.mockResolvedValueOnce({
      id: "z1",
      name: "Z",
      cities: [],
      priceCop: 10000,
      isPickup: false,
      createdAt: new Date(),
    } as any);
    await expect(
      svc.createFromCart({ userId: null, guestToken: "g1" }, dto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("OrdersService.findById", () => {
  beforeEach(() => {
    mockReset(prisma);
    mockReset(cart);
    mockReset(shipping);
  });

  it("returns the order when admin asks", async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce({
      id: "o1",
      customerId: "u2",
      items: [],
      shippingAddress: {},
      status: "paid",
      reference: "BMR-1",
      subtotal: 0,
      shippingCost: 0,
      total: 0,
      shippingMethod: "X",
      guestEmail: null,
      guestPhone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const out = await svc.findById("o1", {
      id: "u1",
      permissions: ["orders:read"],
    } as any);
    expect(out.id).toBe("o1");
  });

  it("rejects when customer asks for someone else's order", async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce({
      id: "o1",
      customerId: "u2",
      items: [],
      shippingAddress: {},
      status: "paid",
      reference: "BMR-1",
      subtotal: 0,
      shippingCost: 0,
      total: 0,
      shippingMethod: "X",
      guestEmail: null,
      guestPhone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(
      svc.findById("o1", { id: "u1", permissions: ["orders:read:own"] } as any),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("OrdersService.updateStatus", () => {
  beforeEach(() => mockReset(prisma));

  const baseOrder = {
    id: "o1",
    items: [],
    shippingAddress: {},
    status: "pending",
    reference: "r",
    subtotal: 0,
    shippingCost: 0,
    total: 0,
    shippingMethod: "X",
    guestEmail: null,
    guestPhone: null,
    customerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("allows pending → paid", async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce({
      ...baseOrder,
      status: "pending",
    });
    (prisma.order as any).update.mockResolvedValueOnce({
      ...baseOrder,
      status: "paid",
    });
    const out = await svc.updateStatus("o1", "paid");
    expect(out.status).toBe("paid");
  });

  it("rejects delivered → pending", async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce({
      ...baseOrder,
      status: "delivered",
    });
    await expect(svc.updateStatus("o1", "pending")).rejects.toBeInstanceOf(
      Error,
    ); // BadRequestException
  });

  it("cancel allowed from pending", async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce({
      ...baseOrder,
      status: "pending",
    });
    (prisma.order as any).update.mockResolvedValueOnce({
      ...baseOrder,
      status: "cancelled",
    });
    const out = await svc.updateStatus("o1", "cancelled");
    expect(out.status).toBe("cancelled");
  });

  it("cancel rejected from shipped", async () => {
    (prisma.order as any).findUnique.mockResolvedValueOnce({
      ...baseOrder,
      status: "shipped",
    });
    await expect(svc.updateStatus("o1", "cancelled")).rejects.toBeInstanceOf(
      Error,
    );
  });
});
