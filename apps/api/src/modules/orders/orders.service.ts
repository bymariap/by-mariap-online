import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CartService, CartOwner } from "../cart/cart.service";
import { ShippingService } from "../shipping/shipping.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import type { AuthUser } from "../../common/types/auth-user";
import { OrderStatus } from "@prisma/client";

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cart: CartService,
    private shipping: ShippingService,
  ) {}

  async createFromCart(owner: CartOwner, dto: CreateOrderDto) {
    const cart = owner.userId
      ? await this.cart.getForUser(owner.userId)
      : await this.cart.getForGuest(owner.guestToken!);

    if (cart.items.length === 0) {
      throw new BadRequestException("Cart is empty");
    }

    if (!owner.userId) {
      if (!dto.guestEmail || !dto.guestPhone) {
        throw new BadRequestException(
          "guestEmail and guestPhone required for guest checkout",
        );
      }
    }

    const zone = await this.shipping.findById(dto.shippingZoneId);

    const productIds = cart.items.map((it: any) => it.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stockQuantity: true, name: true, priceCop: true },
    });
    const stockMap = new Map(products.map((p) => [p.id, p]));

    for (const it of cart.items) {
      const p = stockMap.get(it.productId);
      if (!p || p.stockQuantity < it.quantity) {
        throw new HttpException(
          {
            code: "OUT_OF_STOCK",
            message: `Insufficient stock for ${p?.name ?? it.productId}`,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    const subtotal = cart.items.reduce(
      (s: number, it: { lineTotal: number }) => s + it.lineTotal,
      0,
    );
    const shippingCost = zone.priceCop;
    const total = subtotal + shippingCost;
    const reference = `BMR-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          reference,
          customerId: owner.userId,
          guestEmail: owner.userId ? null : dto.guestEmail!,
          guestPhone: owner.userId ? null : dto.guestPhone!,
          subtotal,
          shippingCost,
          total,
          status: "pending",
          shippingAddress:
            dto.shippingAddress as unknown as Prisma.InputJsonValue,
          shippingMethod: zone.name,
          items: {
            create: cart.items.map((it: any) => ({
              productId: it.productId,
              nameSnapshot: it.productName,
              quantity: it.quantity,
              unitPriceSnapshot: it.unitPriceSnapshot,
            })),
          },
        },
        include: { items: true },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: "wompi",
          status: "pending",
          amount: total,
          currency: "COP",
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return this.shape(order);
    });
  }

  async findById(id: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException();

    const wide =
      user.permissions.includes("orders:read") ||
      user.permissions.includes("*");
    if (!wide) {
      const isOwner = order.customerId === user.id;
      if (!isOwner) throw new ForbiddenException();
    }
    return this.shape(order);
  }

  async findByReference(reference: string) {
    const order = await this.prisma.order.findUnique({
      where: { reference },
      include: { items: true },
    });
    if (!order) throw new NotFoundException();
    return this.shape(order);
  }

  async listForUser(userId: string) {
    const rows = await this.prisma.order.findMany({
      where: { customerId: userId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((o) => this.shape(o));
  }

  async listAdmin(status?: OrderStatus) {
    const rows = await this.prisma.order.findMany({
      where: status ? { status } : {},
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((o) => this.shape(o));
  }

  async updateStatus(id: string, next: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException();
    if (!isValidTransition(order.status, next)) {
      throw new BadRequestException(
        `Invalid transition ${order.status} → ${next}`,
      );
    }
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: next },
      include: { items: true },
    });
    return this.shape(updated);
  }

  private shape(order: any) {
    return {
      id: order.id,
      reference: order.reference,
      status: order.status,
      customerId: order.customerId,
      guestEmail: order.guestEmail,
      guestPhone: order.guestPhone,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      total: order.total,
      shippingAddress: order.shippingAddress,
      shippingMethod: order.shippingMethod,
      items: order.items.map((it: any) => ({
        id: it.id,
        productId: it.productId,
        nameSnapshot: it.nameSnapshot,
        quantity: it.quantity,
        unitPriceSnapshot: it.unitPriceSnapshot,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
