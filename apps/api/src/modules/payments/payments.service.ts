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

  async processWebhook(body: any, headerChecksum: string): Promise<void> {
    const eventSecret = process.env.WOMPI_EVENT_SECRET;
    if (!eventSecret) throw new Error("WOMPI_EVENT_SECRET not configured");

    const properties = (body.signature?.properties ?? []) as string[];
    const propertyValues = properties.map((path) => ({
      path,
      value: String(pickPath(body.data, stripPrefix(path))),
    }));

    const expected = computeEventSignature({
      properties: propertyValues,
      timestamp: body.timestamp,
      eventSecret,
    });

    if (expected !== headerChecksum) {
      throw new UnauthorizedException("Invalid Wompi signature");
    }

    const existing = await this.prisma.webhookLog.findUnique({
      where: {
        provider_eventKey: { provider: "wompi", eventKey: headerChecksum },
      },
    });
    if (existing?.processedAt) return; // idempotent
    if (!existing) {
      await this.prisma.webhookLog.create({
        data: {
          provider: "wompi",
          eventKey: headerChecksum,
          eventType: body.event ?? "unknown",
          rawPayload: body,
        },
      });
    }

    const tx = body.data?.transaction;
    if (!tx) throw new BadRequestException("Malformed event");

    const orderRef: string = tx.reference;
    const wompiStatus: string = tx.status;

    await this.prisma.$transaction(async (db) => {
      const order = await db.order.findUnique({
        where: { reference: orderRef },
        include: { items: true },
      });
      if (!order) throw new NotFoundException("Order not found for reference");

      if (wompiStatus === "APPROVED") {
        if (order.status === "pending") {
          await db.order.update({
            where: { id: order.id },
            data: { status: "paid" },
          });
          for (const it of order.items) {
            await db.product.update({
              where: { id: it.productId },
              data: { stockQuantity: { decrement: it.quantity } },
            });
          }
        }
        await db.payment.update({
          where: { orderId: order.id },
          data: { status: "approved", providerTxId: tx.id, rawPayload: body },
        });
      } else if (
        wompiStatus === "DECLINED" ||
        wompiStatus === "VOIDED" ||
        wompiStatus === "ERROR"
      ) {
        if (order.status === "pending") {
          await db.order.update({
            where: { id: order.id },
            data: { status: "cancelled" },
          });
        }
        await db.payment.update({
          where: { orderId: order.id },
          data: {
            status: wompiStatus.toLowerCase(),
            providerTxId: tx.id,
            rawPayload: body,
          },
        });
      }

      await db.webhookLog.update({
        where: {
          provider_eventKey: { provider: "wompi", eventKey: headerChecksum },
        },
        data: { processedAt: new Date() },
      });
    });
  }
}

function stripPrefix(path: string): string {
  // Wompi properties are paths into the event payload below the "data" wrapper, e.g.
  // "transaction.id" → we resolve against body.data so we strip nothing; if your
  // mapping differs, adjust here.
  return path;
}

function pickPath(root: any, path: string): unknown {
  return path
    .split(".")
    .reduce<any>((acc, key) => (acc == null ? acc : acc[key]), root);
}
