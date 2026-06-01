import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  findPublic() {
    return this.prisma.service.findMany({
      where: { status: 'published' }, orderBy: { name: 'asc' },
    });
  }

  findAdmin() {
    return this.prisma.service.findMany({ where: {}, orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    const s = await this.prisma.service.findUnique({ where: { id } });
    if (!s) throw new NotFoundException();
    return s;
  }

  async findBySlug(slug: string) {
    const s = await this.prisma.service.findUnique({ where: { slug } });
    if (!s) throw new NotFoundException();
    return s;
  }

  async create(dto: CreateServiceDto) {
    try {
      return await this.prisma.service.create({ data: dto });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('Slug already exists');
      throw e;
    }
  }

  async update(id: string, dto: UpdateServiceDto) {
    try {
      return await this.prisma.service.update({ where: { id }, data: dto });
    } catch (e: any) {
      if (e.code === 'P2025') throw new NotFoundException();
      if (e.code === 'P2002') throw new ConflictException('Slug already exists');
      throw e;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.service.delete({ where: { id } });
    } catch (e: any) {
      if (e.code === 'P2025') throw new NotFoundException();
      throw e;
    }
  }
}
