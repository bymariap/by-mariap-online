import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AddItemDto } from "./dto/add-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";

export interface CartOwner {
  userId: string | null;
  guestToken: string | null;
}

const INCLUDE = {
  items: { include: { product: true }, orderBy: { id: "asc" as const } },
} satisfies Prisma.CartInclude;

function shape(cart: any) {
  const items = cart.items.map((it: any) => ({
    id: it.id,
    productId: it.productId,
    productName: it.product.name,
    productSlug: it.product.slug,
    productImageUrl: it.product.imageUrls[0] ?? null,
    quantity: it.quantity,
    unitPriceSnapshot: it.unitPriceSnapshot,
    lineTotal: it.quantity * it.unitPriceSnapshot,
  }));
  const subtotal = items.reduce(
    (sum: number, it: any) => sum + it.lineTotal,
    0,
  );
  return { id: cart.id, items, subtotal };
}

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getForUser(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { customerId: userId },
      include: INCLUDE,
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { customerId: userId },
        include: INCLUDE,
      });
    }
    return shape(cart);
  }

  async getForGuest(token: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { guestToken: token },
      include: INCLUDE,
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { guestToken: token },
        include: INCLUDE,
      });
    }
    return shape(cart);
  }

  private async resolveCart(owner: CartOwner) {
    if (owner.userId) return this.getRaw({ customerId: owner.userId }, true);
    if (owner.guestToken)
      return this.getRaw({ guestToken: owner.guestToken }, true);
    throw new BadRequestException("No cart owner");
  }

  private async getRaw(
    where: Prisma.CartWhereUniqueInput,
    createIfMissing: boolean,
  ) {
    let cart = await this.prisma.cart.findUnique({ where, include: INCLUDE });
    if (!cart && createIfMissing) {
      cart = await this.prisma.cart.create({
        data: {
          customerId: where.customerId ?? null,
          guestToken: where.guestToken ?? null,
        },
        include: INCLUDE,
      });
    }
    if (!cart) throw new NotFoundException();
    return cart;
  }

  async addItem(owner: CartOwner, dto: AddItemDto) {
    const cart = await this.resolveCart(owner);
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product || product.status !== "published")
      throw new NotFoundException();
    await this.prisma.cartItem.upsert({
      where: {
        cartId_productId: { cartId: cart.id, productId: dto.productId },
      },
      create: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
        unitPriceSnapshot: product.priceCop,
      },
      update: { quantity: { increment: dto.quantity } },
    });
    return shape(await this.getRaw({ id: cart.id }, false));
  }

  async updateItem(owner: CartOwner, itemId: string, dto: UpdateItemDto) {
    const cart = await this.resolveCart(owner);
    const item = cart.items.find((it: any) => it.id === itemId);
    if (!item) throw new NotFoundException();
    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });
    return shape(await this.getRaw({ id: cart.id }, false));
  }

  async removeItem(owner: CartOwner, itemId: string) {
    const cart = await this.resolveCart(owner);
    const item = cart.items.find((it: any) => it.id === itemId);
    if (!item) throw new NotFoundException();
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return shape(await this.getRaw({ id: cart.id }, false));
  }

  async clear(cartId: string) {
    await this.prisma.cartItem.deleteMany({ where: { cartId } });
  }

  async mergeGuestIntoUser(guestToken: string, userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const guestCart = await tx.cart.findUnique({
        where: { guestToken },
        include: { items: true },
      });
      if (!guestCart) return;

      let userCart = await tx.cart.findUnique({
        where: { customerId: userId },
        include: { items: true },
      });
      if (!userCart) {
        userCart = await tx.cart.create({
          data: { customerId: userId },
          include: { items: true },
        });
      }

      for (const gi of guestCart.items) {
        await tx.cartItem.upsert({
          where: {
            cartId_productId: { cartId: userCart.id, productId: gi.productId },
          },
          create: {
            cartId: userCart.id,
            productId: gi.productId,
            quantity: gi.quantity,
            unitPriceSnapshot: gi.unitPriceSnapshot,
          },
          update: { quantity: { increment: gi.quantity } },
        });
      }

      await tx.cart.delete({ where: { id: guestCart.id } });
    });
  }
}
