import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    const c = await this.prisma.category.findUnique({ where: { id } });
    if (!c) throw new NotFoundException();
    return c;
  }

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({ data: dto });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('Slug already exists');
      throw e;
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    try {
      return await this.prisma.category.update({ where: { id }, data: dto });
    } catch (e: any) {
      if (e.code === 'P2025') throw new NotFoundException();
      if (e.code === 'P2002') throw new ConflictException('Slug already exists');
      throw e;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (e: any) {
      if (e.code === 'P2025') throw new NotFoundException();
      throw e;
    }
  }
}
