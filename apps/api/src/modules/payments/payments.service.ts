import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { WompiClient } from "./wompi.client";
import { computeEventSignature } from "./wompi.crypto";

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private wompi: WompiClient,
  ) {}

  async createIntent(orderReference: string) {
    const order = await this.prisma.order.findUnique({
      where: { reference: orderReference },
    });
    if (!order) throw new NotFoundException();
    if (order.status !== "pending") {
      throw new BadRequestException("Order not pending");
    }
    return this.wompi.buildIntent({
      reference: order.reference,
      amountInCents: order.total * 100,
    });
  }
}
