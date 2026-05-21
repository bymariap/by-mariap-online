import { mockDeep, mockReset } from "jest-mock-extended";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ProductsService } from "./products.service";

const prisma = mockDeep<PrismaService>();
const svc = new ProductsService(prisma);

const productRow = {
  id: "p1",
  name: "X",
  slug: "x",
  description: null,
  priceCop: 50000,
  stockQuantity: 10,
  imageUrls: [],
  status: "draft",
  categories: [{ category: { id: "c1", name: "Cejas", slug: "cejas" } }],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("ProductsService", () => {
  beforeEach(() => mockReset(prisma));

  it("creates a product with category links", async () => {
    (prisma.product as any).create.mockResolvedValueOnce(productRow);
    const out = await svc.create({
      name: "X",
      slug: "x",
      priceCop: 50000,
      stockQuantity: 10,
      imageUrls: [],
      categoryIds: ["c1"],
      status: "draft" as any,
    });
    expect(out.categories[0].slug).toBe("cejas");
    const call = (prisma.product.create as jest.Mock).mock.calls[0][0];
    expect(call.data.categories.create).toEqual([{ categoryId: "c1" }]);
  });

  it("rejects duplicate slug as 409", async () => {
    (prisma.product as any).create.mockRejectedValueOnce(
      Object.assign(new Error(), { code: "P2002" }),
    );
    await expect(
      svc.create({
        name: "X",
        slug: "x",
        priceCop: 1,
        stockQuantity: 0,
        imageUrls: [],
        categoryIds: [],
        status: "draft" as any,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("updates replaces categories atomically", async () => {
    (prisma.$transaction as any).mockImplementationOnce(async (fn: any) => {
      const tx = {
        productCategory: { deleteMany: jest.fn().mockResolvedValue({}) },
        product: { update: jest.fn().mockResolvedValueOnce(productRow) },
      };
      return fn(tx);
    });
    const out = await svc.update("p1", { categoryIds: ["c2"] });
    expect(out.id).toBe("p1");
  });

  it("filters public list to published only", async () => {
    (prisma.product as any).findMany.mockResolvedValueOnce([productRow]);
    await svc.findPublic({});
    const call = (prisma.product.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.status).toBe("published");
  });

  it("admin list includes all statuses", async () => {
    (prisma.product as any).findMany.mockResolvedValueOnce([productRow]);
    await svc.findAdmin({});
    const call = (prisma.product.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.status).toBeUndefined();
  });

  it("throws 404 on findBySlug missing", async () => {
    (prisma.product as any).findUnique.mockResolvedValueOnce(null);
    await expect(svc.findBySlug("nope")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
