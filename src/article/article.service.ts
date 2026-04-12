import {
  Injectable
  , NotFoundException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { Article, ArticleStatus } from './entities/article.entity';
import { ListArticleQueryDto } from './dto/list-article-query.dto';

type PaginatedArticleResponse = {
  total: number;
  page: number;
  limit: number;
  data: Article[];
};

type DbArticle = {
  id: string;
  title: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  authorId: string | null;
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags?: Array<{ name: string }>;
};

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) { }

  private toResponse(article: DbArticle): Article {
    return {
      id: article.id,
      title: article.title,
      content: article.content,
      status: article.status.toLowerCase() as ArticleStatus,
      authorId: article.authorId,
      categoryId: article.categoryId,
      tags: article.tags ? article.tags.map((tag) => tag.name) : [],
      createdAt: article.createdAt.getTime(),
      updatedAt: article.updatedAt.getTime(),
    };
  }

  private toDbStatus(status: ArticleStatus): 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' {
    if (status === ArticleStatus.PUBLISHED) {
      return 'PUBLISHED';
    }

    if (status === ArticleStatus.ARCHIVED) {
      return 'ARCHIVED';
    }

    return 'DRAFT';
  }

  private buildTagConnectOrCreate(tags?: string[]) {
    if (!tags) {
      return undefined;
    }

    return tags.map((tag) => ({
      where: { name: tag },
      create: { name: tag },
    }));
  }

  async create(createArticleDto: CreateArticleDto): Promise<Article> {
    var article = await this.prisma.article.create({
      data: {
        title: createArticleDto.title,
        content: createArticleDto.content,
        status: this.toDbStatus(createArticleDto.status ?? ArticleStatus.DRAFT),
        authorId:
          typeof createArticleDto.authorId === 'undefined'
            ? null
            : createArticleDto.authorId,
        categoryId:
          typeof createArticleDto.categoryId === 'undefined'
            ? null
            : createArticleDto.categoryId,
        ...(typeof createArticleDto.tags !== 'undefined'
          ? {
            tags: {
              connectOrCreate: this.buildTagConnectOrCreate(createArticleDto.tags),
            },
          }
          : {}),
      },
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    return this.toResponse(article);
  }

  async findAll(query?: ListArticleQueryDto): Promise<Article[] | PaginatedArticleResponse> {
    var hasPagination =
      typeof query?.page !== 'undefined' || typeof query?.limit !== 'undefined';
    var hasSorting =
      typeof query?.sortBy !== 'undefined' || typeof query?.order !== 'undefined';

    var where = {
      ...(typeof query?.status !== 'undefined'
        ? { status: this.toDbStatus(query.status) }
        : {}),
      ...(typeof query?.categoryId !== 'undefined'
        ? { categoryId: query.categoryId }
        : {}),
      ...(typeof query?.tag !== 'undefined'
        ? {
          tags: {
            some: {
              name: query.tag,
            },
          },
        }
        : {}),
    };

    var orderBy = query?.sortBy
      ? {
        [query.sortBy]: query.order ?? 'asc',
      }
      : undefined;

    if (!hasPagination && !hasSorting) {
      var articles = await this.prisma.article.findMany({
        where,
        orderBy,
        include: {
          tags: {
            select: { name: true },
          },
        },
      });

      return articles.map((article) => this.toResponse(article));
    }

    var total = await this.prisma.article.count({ where });
    var page = Number(query?.page ?? 1);
    var limit = Number((query?.limit ?? total) || 1);
    var skip = (page - 1) * limit;

    var articles = await this.prisma.article.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    return {
      total,
      page,
      limit,
      data: articles.map((article) => this.toResponse(article)),
    };
  }

  async findOne(id: string): Promise<Article> {
    var article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return this.toResponse(article);
  }

  async update(id: string, updateArticleDto: UpdateArticleDto): Promise<Article> {
    var article = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    var updatedArticle = await this.prisma.article.update({
      where: { id },
      data: {
        ...(typeof updateArticleDto.title !== 'undefined'
          ? { title: updateArticleDto.title }
          : {}),
        ...(typeof updateArticleDto.content !== 'undefined'
          ? { content: updateArticleDto.content }
          : {}),
        ...(typeof updateArticleDto.status !== 'undefined'
          ? { status: this.toDbStatus(updateArticleDto.status) }
          : {}),
        ...(typeof updateArticleDto.authorId !== 'undefined'
          ? { authorId: updateArticleDto.authorId }
          : {}),
        ...(typeof updateArticleDto.categoryId !== 'undefined'
          ? { categoryId: updateArticleDto.categoryId }
          : {}),
        ...(typeof updateArticleDto.tags !== 'undefined'
          ? {
            tags: {
              set: [],
              connectOrCreate: this.buildTagConnectOrCreate(updateArticleDto.tags),
            },
          }
          : {}),
      },
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    return this.toResponse(updatedArticle);
  }

  async nullifyCategoryId(categoryId: string): Promise<void> {
    await this.prisma.article.updateMany({
      where: { categoryId },
      data: { categoryId: null },
    });
  }

  async nullifyAuthorId(authorId: string): Promise<void> {
    await this.prisma.article.updateMany({
      where: { authorId },
      data: { authorId: null },
    });
  }

  async remove(id: string): Promise<void> {
    var article = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    await this.prisma.article.delete({
      where: { id },
    });
  }
}