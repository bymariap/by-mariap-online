import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ListProductsQuery } from "./dto/list-products.query";

const INCLUDE = {
  categories: { include: { category: true } },
} satisfies Prisma.ProductInclude;

function shape(row: any) {
  return {
    ...row,
    categories: row.categories.map((pc: any) => pc.category),
  };
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAdmin(q: ListProductsQuery) {
    const rows = await this.prisma.product.findMany({
      where: this.where(q, false),
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(shape);
  }

  async findPublic(q: ListProductsQuery) {
    const rows = await this.prisma.product.findMany({
      where: this.where(q, true),
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(shape);
  }

  async findById(id: string) {
    const row = await this.prisma.product.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!row) throw new NotFoundException();
    return shape(row);
  }

  async findBySlug(slug: string) {
    const row = await this.prisma.product.findUnique({
      where: { slug },
      include: INCLUDE,
    });
    if (!row) throw new NotFoundException();
    return shape(row);
  }

  async create(dto: CreateProductDto) {
    try {
      const row = await this.prisma.product.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          priceCop: dto.priceCop,
          stockQuantity: dto.stockQuantity,
          imageUrls: dto.imageUrls,
          status: dto.status,
          categories: {
            create: dto.categoryIds.map((categoryId) => ({ categoryId })),
          },
        },
        include: INCLUDE,
      });
      return shape(row);
    } catch (e: any) {
      if (e.code === "P2002")
        throw new ConflictException("Slug already exists");
      throw e;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.categoryIds) {
          await tx.productCategory.deleteMany({ where: { productId: id } });
        }
        const { categoryIds, ...rest } = dto;
        const row = await tx.product.update({
          where: { id },
          data: {
            ...rest,
            ...(categoryIds && {
              categories: {
                create: categoryIds.map((cid) => ({ categoryId: cid })),
              },
            }),
          },
          include: INCLUDE,
        });
        return shape(row);
      });
    } catch (e: any) {
      if (e.code === "P2025") throw new NotFoundException();
      if (e.code === "P2002")
        throw new ConflictException("Slug already exists");
      throw e;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (e: any) {
      if (e.code === "P2025") throw new NotFoundException();
      throw e;
    }
  }

  private where(
    q: ListProductsQuery,
    publicOnly: boolean,
  ): Prisma.ProductWhereInput {
    return {
      ...(publicOnly
        ? { status: "published" }
        : q.status
          ? { status: q.status }
          : {}),
      ...(q.categorySlug
        ? { categories: { some: { category: { slug: q.categorySlug } } } }
        : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: "insensitive" } },
              { slug: { contains: q.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
  }
}
