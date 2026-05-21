import { mockDeep, mockReset } from "jest-mock-extended";
import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CartService } from "./cart.service";

const prisma = mockDeep<PrismaService>();
const svc = new CartService(prisma);

const includeShape = {
  items: { include: { product: true }, orderBy: { id: "asc" as const } },
};

const productRow = {
  id: "p1",
  name: "X",
  slug: "x",
  priceCop: 50000,
  stockQuantity: 5,
  imageUrls: ["http://img"],
  status: "published",
};

const cartRow = (overrides: any = {}) => ({
  id: "c1",
  customerId: "u1",
  guestToken: null,
  items: [
    {
      id: "ci1",
      cartId: "c1",
      productId: "p1",
      quantity: 2,
      unitPriceSnapshot: 50000,
      product: productRow,
    },
  ],
  ...overrides,
});

describe("CartService", () => {
  beforeEach(() => mockReset(prisma));

  it("returns existing cart by customerId", async () => {
    (prisma.cart as any).findUnique.mockResolvedValueOnce(cartRow());
    const out = await svc.getForUser("u1");
    expect(out.items[0].productName).toBe("X");
    expect(out.subtotal).toBe(100000);
  });

  it("creates cart on first access by customerId", async () => {
    (prisma.cart as any).findUnique.mockResolvedValueOnce(null);
    (prisma.cart as any).create.mockResolvedValueOnce(cartRow({ items: [] }));
    const out = await svc.getForUser("u1");
    expect(out.items).toEqual([]);
    expect(prisma.cart.create).toHaveBeenCalledWith({
      data: { customerId: "u1" },
      include: includeShape,
    });
  });

  it("returns existing cart by guestToken", async () => {
    (prisma.cart as any).findUnique.mockResolvedValueOnce(
      cartRow({ customerId: null, guestToken: "g1" }),
    );
    const out = await svc.getForGuest("g1");
    expect(out.id).toBe("c1");
  });

  it("adds item — new product creates row", async () => {
    (prisma.cart as any).findUnique.mockResolvedValueOnce(
      cartRow({ items: [] }),
    );
    (prisma.product as any).findUnique.mockResolvedValueOnce(productRow);
    (prisma.cartItem as any).upsert.mockResolvedValueOnce({});
    (prisma.cart as any).findUnique.mockResolvedValueOnce(cartRow());

    await svc.addItem(
      { userId: "u1", guestToken: null },
      { productId: "p1", quantity: 2 },
    );
    expect(prisma.cartItem.upsert).toHaveBeenCalledWith({
      where: { cartId_productId: { cartId: "c1", productId: "p1" } },
      create: {
        cartId: "c1",
        productId: "p1",
        quantity: 2,
        unitPriceSnapshot: 50000,
      },
      update: { quantity: { increment: 2 } },
    });
  });

  it("addItem rejects unpublished product", async () => {
    (prisma.cart as any).findUnique.mockResolvedValueOnce(
      cartRow({ items: [] }),
    );
    (prisma.product as any).findUnique.mockResolvedValueOnce({
      ...productRow,
      status: "draft",
    });
    await expect(
      svc.addItem(
        { userId: "u1", guestToken: null },
        { productId: "p1", quantity: 1 },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("updateItem sets exact quantity", async () => {
    (prisma.cart as any).findUnique.mockResolvedValueOnce(cartRow());
    (prisma.cartItem as any).update.mockResolvedValueOnce({});
    (prisma.cart as any).findUnique.mockResolvedValueOnce(cartRow());

    await svc.updateItem({ userId: "u1", guestToken: null }, "ci1", {
      quantity: 3,
    });
    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: "ci1" },
      data: { quantity: 3 },
    });
  });

  it("removeItem deletes by id", async () => {
    (prisma.cart as any).findUnique.mockResolvedValueOnce(cartRow());
    (prisma.cartItem as any).delete.mockResolvedValueOnce({});
    (prisma.cart as any).findUnique.mockResolvedValueOnce(
      cartRow({ items: [] }),
    );

    await svc.removeItem({ userId: "u1", guestToken: null }, "ci1");
    expect(prisma.cartItem.delete).toHaveBeenCalledWith({
      where: { id: "ci1" },
    });
  });
});
