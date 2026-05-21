import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ShippingService {
  constructor(private prisma: PrismaService) {}

  async findOptionsByCity(city: string) {
    const all = await this.prisma.shippingZone.findMany();
    const normalized = city.trim().toLowerCase();
    return all.filter(
      (z) => z.isPickup || z.cities.some((c) => c.toLowerCase() === normalized),
    );
  }

  async findById(id: string) {
    const z = await this.prisma.shippingZone.findUnique({ where: { id } });
    if (!z) throw new NotFoundException();
    return z;
  }
}
