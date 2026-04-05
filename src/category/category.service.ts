import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { ArticleService } from '../article/article.service';

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

  findAll(): Category[] {
    return Array.from(this.categories.values());
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