import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArticleService } from '../../../src/article/article.service';
import { ArticleStatus } from '../../../src/article/entities/article.entity';
import { PrismaService } from '../../../src/prisma/prisma.service';

type MockFunction = ReturnType<typeof vi.fn>;

describe('ArticleService', () => {
  var service: ArticleService;

  var prismaMock: {
    article: {
      create: MockFunction;
      findMany: MockFunction;
      count: MockFunction;
      findUnique: MockFunction;
      update: MockFunction;
      updateMany: MockFunction;
      delete: MockFunction;
    };
  };

  var now = new Date('2026-04-26T00:00:00.000Z');
  var articleId = '550e8400-e29b-41d4-a716-446655440000';
  var authorId = '550e8400-e29b-41d4-a716-446655440001';
  var categoryId = '550e8400-e29b-41d4-a716-446655440002';

  var dbDraftArticle = {
    id: articleId,
    title: 'Node.js article',
    content: 'Article content',
    status: 'DRAFT' as const,
    authorId,
    categoryId,
    createdAt: now,
    updatedAt: now,
    tags: [
      { name: 'nodejs' },
      { name: 'nestjs' },
    ],
  };

  var dbPublishedArticle = Object.assign({}, dbDraftArticle, {
    status: 'PUBLISHED' as const,
  });

  var dbArchivedArticle = Object.assign({}, dbDraftArticle, {
    status: 'ARCHIVED' as const,
  });

  beforeEach(async () => {
    prismaMock = {
      article: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
    };

    var moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = moduleRef.get<ArticleService>(ArticleService);

    vi.clearAllMocks();
  });

  it('should create article with default draft status and nullable relations', async () => {
    var createdArticle = Object.assign({}, dbDraftArticle, {
      authorId: null,
      categoryId: null,
      tags: [],
    });

    prismaMock.article.create.mockResolvedValue(createdArticle);

    var result = await service.create({
      title: 'Node.js article',
      content: 'Article content',
    });

    expect(prismaMock.article.create).toHaveBeenCalledWith({
      data: {
        title: 'Node.js article',
        content: 'Article content',
        status: 'DRAFT',
        authorId: null,
        categoryId: null,
      },
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    expect(result).toEqual({
      id: articleId,
      title: 'Node.js article',
      content: 'Article content',
      status: ArticleStatus.DRAFT,
      authorId: null,
      categoryId: null,
      tags: [],
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    });
  });

  it('should create article with tags using connectOrCreate', async () => {
    prismaMock.article.create.mockResolvedValue(dbPublishedArticle);

    var result = await service.create({
      title: 'Node.js article',
      content: 'Article content',
      status: ArticleStatus.PUBLISHED,
      authorId,
      categoryId,
      tags: ['nodejs', 'nestjs'],
    });

    expect(prismaMock.article.create).toHaveBeenCalledWith({
      data: {
        title: 'Node.js article',
        content: 'Article content',
        status: 'PUBLISHED',
        authorId,
        categoryId,
        tags: {
          connectOrCreate: [
            {
              where: { name: 'nodejs' },
              create: { name: 'nodejs' },
            },
            {
              where: { name: 'nestjs' },
              create: { name: 'nestjs' },
            },
          ],
        },
      },
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    expect(result.tags).toEqual(['nodejs', 'nestjs']);
    expect(result.status).toBe(ArticleStatus.PUBLISHED);
  });

  it('should find all articles without pagination', async () => {
    prismaMock.article.findMany.mockResolvedValue([dbDraftArticle]);

    var result = await service.findAll();

    expect(prismaMock.article.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: undefined,
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    expect(result).toEqual([
      {
        id: articleId,
        title: 'Node.js article',
        content: 'Article content',
        status: ArticleStatus.DRAFT,
        authorId,
        categoryId,
        tags: ['nodejs', 'nestjs'],
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
      },
    ]);
  });

  it('should apply status, categoryId and tag filters', async () => {
    prismaMock.article.findMany.mockResolvedValue([dbPublishedArticle]);

    var result = await service.findAll({
      status: ArticleStatus.PUBLISHED,
      categoryId,
      tag: 'nodejs',
    });

    expect(prismaMock.article.findMany).toHaveBeenCalledWith({
      where: {
        status: 'PUBLISHED',
        categoryId,
        tags: {
          some: {
            name: 'nodejs',
          },
        },
      },
      orderBy: undefined,
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    expect(result).toHaveLength(1);
  });

  it('should return paginated and sorted articles', async () => {
    prismaMock.article.count.mockResolvedValue(12);
    prismaMock.article.findMany.mockResolvedValue([dbDraftArticle]);

    var result = await service.findAll({
      page: 2,
      limit: 5,
      sortBy: 'createdAt',
      order: 'desc',
    });

    expect(prismaMock.article.count).toHaveBeenCalledWith({
      where: {},
    });

    expect(prismaMock.article.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: {
        createdAt: 'desc',
      },
      skip: 5,
      take: 5,
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    expect(result).toEqual({
      total: 12,
      page: 2,
      limit: 5,
      data: [
        {
          id: articleId,
          title: 'Node.js article',
          content: 'Article content',
          status: ArticleStatus.DRAFT,
          authorId,
          categoryId,
          tags: ['nodejs', 'nestjs'],
          createdAt: now.getTime(),
          updatedAt: now.getTime(),
        },
      ],
    });
  });

  it('should find one article by id', async () => {
    prismaMock.article.findUnique.mockResolvedValue(dbDraftArticle);

    var result = await service.findOne(articleId);

    expect(prismaMock.article.findUnique).toHaveBeenCalledWith({
      where: { id: articleId },
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    expect(result.id).toBe(articleId);
    expect(result.tags).toEqual(['nodejs', 'nestjs']);
  });

  it('should throw NotFoundException when article does not exist', async () => {
    prismaMock.article.findUnique.mockResolvedValue(null);

    await expect(service.findOne(articleId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should update article fields', async () => {
    var updatedArticle = Object.assign({}, dbDraftArticle, {
      title: 'Updated title',
      content: 'Updated content',
      authorId: null,
      categoryId: null,
    });

    prismaMock.article.findUnique.mockResolvedValue(dbDraftArticle);
    prismaMock.article.update.mockResolvedValue(updatedArticle);

    var result = await service.update(articleId, {
      title: 'Updated title',
      content: 'Updated content',
      authorId: null,
      categoryId: null,
    });

    expect(prismaMock.article.update).toHaveBeenCalledWith({
      where: { id: articleId },
      data: {
        title: 'Updated title',
        content: 'Updated content',
        authorId: null,
        categoryId: null,
      },
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    expect(result.title).toBe('Updated title');
    expect(result.content).toBe('Updated content');
    expect(result.authorId).toBeNull();
    expect(result.categoryId).toBeNull();
  });

  it('should update article tags using set and connectOrCreate', async () => {
    var updatedArticle = Object.assign({}, dbDraftArticle, {
      tags: [
        { name: 'testing' },
        { name: 'vitest' },
      ],
    });

    prismaMock.article.findUnique.mockResolvedValue(dbDraftArticle);
    prismaMock.article.update.mockResolvedValue(updatedArticle);

    var result = await service.update(articleId, {
      tags: ['testing', 'vitest'],
    });

    expect(prismaMock.article.update).toHaveBeenCalledWith({
      where: { id: articleId },
      data: {
        tags: {
          set: [],
          connectOrCreate: [
            {
              where: { name: 'testing' },
              create: { name: 'testing' },
            },
            {
              where: { name: 'vitest' },
              create: { name: 'vitest' },
            },
          ],
        },
      },
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    expect(result.tags).toEqual(['testing', 'vitest']);
  });

  it('should allow draft to published status transition', async () => {
    prismaMock.article.findUnique.mockResolvedValue(dbDraftArticle);
    prismaMock.article.update.mockResolvedValue(dbPublishedArticle);

    var result = await service.update(articleId, {
      status: ArticleStatus.PUBLISHED,
    });

    expect(prismaMock.article.update).toHaveBeenCalledWith({
      where: { id: articleId },
      data: {
        status: 'PUBLISHED',
      },
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    expect(result.status).toBe(ArticleStatus.PUBLISHED);
  });

  it('should allow published to archived status transition', async () => {
    prismaMock.article.findUnique.mockResolvedValue(dbPublishedArticle);
    prismaMock.article.update.mockResolvedValue(dbArchivedArticle);

    var result = await service.update(articleId, {
      status: ArticleStatus.ARCHIVED,
    });

    expect(prismaMock.article.update).toHaveBeenCalledWith({
      where: { id: articleId },
      data: {
        status: 'ARCHIVED',
      },
      include: {
        tags: {
          select: { name: true },
        },
      },
    });

    expect(result.status).toBe(ArticleStatus.ARCHIVED);
  });

  it('should reject draft to archived status transition', async () => {
    prismaMock.article.findUnique.mockResolvedValue(dbDraftArticle);

    await expect(
      service.update(articleId, {
        status: ArticleStatus.ARCHIVED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaMock.article.update).not.toHaveBeenCalled();
  });

  it('should reject published to draft status transition', async () => {
    prismaMock.article.findUnique.mockResolvedValue(dbPublishedArticle);

    await expect(
      service.update(articleId, {
        status: ArticleStatus.DRAFT,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaMock.article.update).not.toHaveBeenCalled();
  });

  it('should reject archived to published status transition', async () => {
    prismaMock.article.findUnique.mockResolvedValue(dbArchivedArticle);

    await expect(
      service.update(articleId, {
        status: ArticleStatus.PUBLISHED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaMock.article.update).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when updating missing article', async () => {
    prismaMock.article.findUnique.mockResolvedValue(null);

    await expect(
      service.update(articleId, {
        title: 'Updated title',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prismaMock.article.update).not.toHaveBeenCalled();
  });

  it('should nullify categoryId for related articles', async () => {
    prismaMock.article.updateMany.mockResolvedValue({ count: 2 });

    await service.nullifyCategoryId(categoryId);

    expect(prismaMock.article.updateMany).toHaveBeenCalledWith({
      where: { categoryId },
      data: { categoryId: null },
    });
  });

  it('should nullify authorId for related articles', async () => {
    prismaMock.article.updateMany.mockResolvedValue({ count: 2 });

    await service.nullifyAuthorId(authorId);

    expect(prismaMock.article.updateMany).toHaveBeenCalledWith({
      where: { authorId },
      data: { authorId: null },
    });
  });

  it('should remove article by id', async () => {
    prismaMock.article.findUnique.mockResolvedValue(dbDraftArticle);
    prismaMock.article.delete.mockResolvedValue(dbDraftArticle);

    await service.remove(articleId);

    expect(prismaMock.article.delete).toHaveBeenCalledWith({
      where: { id: articleId },
    });
  });

  it('should throw NotFoundException when removing missing article', async () => {
    prismaMock.article.findUnique.mockResolvedValue(null);

    await expect(service.remove(articleId)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prismaMock.article.delete).not.toHaveBeenCalled();
  });
});