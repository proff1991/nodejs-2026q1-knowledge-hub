import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoryQueryDto } from './dto/list-category-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

type PaginatedCategoryResponse = {
  total: number;
  page: number;
  limit: number;
  data: Category[];
};

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    return this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        description: createCategoryDto.description,
      },
    });
  }

  async findAll(query?: ListCategoryQueryDto): Promise<Category[] | PaginatedCategoryResponse> {
    var hasPagination =
      typeof query?.page !== 'undefined' || typeof query?.limit !== 'undefined';
    var hasSorting =
      typeof query?.sortBy !== 'undefined' || typeof query?.order !== 'undefined';

    var orderBy = query?.sortBy
      ? {
          [query.sortBy]: query.order ?? 'asc',
        }
      : undefined;

    if (!hasPagination && !hasSorting) {
      return this.prisma.category.findMany({
        orderBy,
      });
    }

    var total = await this.prisma.category.count();
    var page = Number(query?.page ?? 1);
    var limit = Number((query?.limit ?? total) || 1);
    var skip = (page - 1) * limit;

    var categories = await this.prisma.category.findMany({
      orderBy,
      skip,
      take: limit,
    });

    return {
      total,
      page,
      limit,
      data: categories,
    };
  }

  async findOne(id: string): Promise<Category> {
    var category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    var category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(typeof updateCategoryDto.name !== 'undefined'
          ? { name: updateCategoryDto.name }
          : {}),
        ...(typeof updateCategoryDto.description !== 'undefined'
          ? { description: updateCategoryDto.description }
          : {}),
      },
    });
  }

  async remove(id: string): Promise<void> {
    var category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.prisma.category.delete({
      where: { id },
    });
  }
}