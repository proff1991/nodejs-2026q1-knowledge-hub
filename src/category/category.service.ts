import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ArticleService } from '../article/article.service';
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
  private readonly categories: Map<string, Category> = new Map();

  constructor(private readonly articleService: ArticleService) {}

  create(createCategoryDto: CreateCategoryDto): Category {
    var category: Category = {
      id: randomUUID(),
      name: createCategoryDto.name,
      description: createCategoryDto.description,
    };

    this.categories.set(category.id, category);

    return category;
  }

  findAll(query?: ListCategoryQueryDto): Category[] | PaginatedCategoryResponse {
    var categories = Array.from(this.categories.values());
    var hasPagination =
      typeof query?.page !== 'undefined' || typeof query?.limit !== 'undefined';
    var hasSorting =
      typeof query?.sortBy !== 'undefined' || typeof query?.order !== 'undefined';

    if (query?.sortBy) {
      var order = query.order ?? 'asc';

      categories.sort((a, b) => {
        var left = a[query.sortBy!] ?? '';
        var right = b[query.sortBy!] ?? '';
        var result = String(left).localeCompare(String(right));

        if (order === 'desc') {
          return result * -1;
        }

        return result;
      });
    }

    if (!hasPagination && !hasSorting) {
      return categories;
    }

    var page = Number(query?.page ?? 1);
    var limit = Number((query?.limit ?? categories.length) || 1);
    var total = categories.length;
    var start = (page - 1) * limit;
    var end = start + limit;
    var data = categories.slice(start, end);

    return {
      total,
      page,
      limit,
      data,
    };
  }

  findOne(id: string): Category {
    var category = this.categories.get(id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  update(id: string, updateCategoryDto: UpdateCategoryDto): Category {
    var category = this.categories.get(id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (typeof updateCategoryDto.name !== 'undefined') {
      category.name = updateCategoryDto.name;
    }

    if (typeof updateCategoryDto.description !== 'undefined') {
      category.description = updateCategoryDto.description;
    }

    this.categories.set(category.id, category);

    return category;
  }

  remove(id: string): void {
    var category = this.categories.get(id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    this.articleService.nullifyCategoryId(id);
    this.categories.delete(id);
  }
}