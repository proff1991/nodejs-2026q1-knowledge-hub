import {
    NotFoundException
    , UnprocessableEntityException
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentService } from '../../../src/comment/comment.service';
import { PrismaService } from '../../../src/prisma/prisma.service';

type MockFunction = ReturnType<typeof vi.fn>;

describe('CommentService', () => {
    var service: CommentService;

    var prismaMock: {
        article: {
            findUnique: MockFunction;
        };
        comment: {
            create: MockFunction;
            findMany: MockFunction;
            count: MockFunction;
            findUnique: MockFunction;
            delete: MockFunction;
            deleteMany: MockFunction;
        };
    };

    var commentId = '550e8400-e29b-41d4-a716-446655440000';
    var articleId = '550e8400-e29b-41d4-a716-446655440001';
    var authorId = '550e8400-e29b-41d4-a716-446655440002';
    var now = new Date('2026-04-26T00:00:00.000Z');

    var dbArticle = {
        id: articleId,
    };

    var dbComment = {
        id: commentId,
        content: 'Useful article',
        articleId,
        authorId,
        createdAt: now,
    };

    var commentResponse = {
        id: commentId,
        content: 'Useful article',
        articleId,
        authorId,
        createdAt: now.getTime(),
    };

    beforeEach(async () => {
        prismaMock = {
            article: {
                findUnique: vi.fn(),
            },
            comment: {
                create: vi.fn(),
                findMany: vi.fn(),
                count: vi.fn(),
                findUnique: vi.fn(),
                delete: vi.fn(),
                deleteMany: vi.fn(),
            },
        };

        var moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                CommentService,
                {
                    provide: PrismaService,
                    useValue: prismaMock,
                },
            ],
        }).compile();

        service = moduleRef.get<CommentService>(CommentService);

        vi.clearAllMocks();
    });

    it('should create comment with authorId', async () => {
        prismaMock.article.findUnique.mockResolvedValue(dbArticle);
        prismaMock.comment.create.mockResolvedValue(dbComment);

        var result = await service.create({
            content: 'Useful article',
            articleId,
            authorId,
        });

        expect(prismaMock.article.findUnique).toHaveBeenCalledWith({
            where: {
                id: articleId,
            },
        });

        expect(prismaMock.comment.create).toHaveBeenCalledWith({
            data: {
                content: 'Useful article',
                articleId,
                authorId,
            },
        });

        expect(result).toEqual(commentResponse);
    });

    it('should create comment with null authorId when authorId is missing', async () => {
        var dbAnonymousComment = Object.assign({}, dbComment, {
            authorId: null,
        });

        prismaMock.article.findUnique.mockResolvedValue(dbArticle);
        prismaMock.comment.create.mockResolvedValue(dbAnonymousComment);

        var result = await service.create({
            content: 'Useful article',
            articleId,
        });

        expect(prismaMock.comment.create).toHaveBeenCalledWith({
            data: {
                content: 'Useful article',
                articleId,
                authorId: null,
            },
        });

        expect(result).toEqual({
            id: commentId,
            content: 'Useful article',
            articleId,
            authorId: null,
            createdAt: now.getTime(),
        });
    });

    it('should create comment with null authorId when authorId is null', async () => {
        var dbAnonymousComment = Object.assign({}, dbComment, {
            authorId: null,
        });

        prismaMock.article.findUnique.mockResolvedValue(dbArticle);
        prismaMock.comment.create.mockResolvedValue(dbAnonymousComment);

        var result = await service.create({
            content: 'Useful article',
            articleId,
            authorId: null,
        });

        expect(prismaMock.comment.create).toHaveBeenCalledWith({
            data: {
                content: 'Useful article',
                articleId,
                authorId: null,
            },
        });

        expect(result.authorId).toBeNull();
    });

    it('should throw UnprocessableEntityException when article does not exist', async () => {
        prismaMock.article.findUnique.mockResolvedValue(null);

        await expect(
            service.create({
                content: 'Useful article',
                articleId,
                authorId,
            }),
        ).rejects.toBeInstanceOf(UnprocessableEntityException);

        expect(prismaMock.comment.create).not.toHaveBeenCalled();
    });

    it('should find all comments for article without pagination and sorting', async () => {
        prismaMock.comment.findMany.mockResolvedValue([dbComment]);

        var result = await service.findAll({
            articleId,
        });

        expect(prismaMock.comment.findMany).toHaveBeenCalledWith({
            where: {
                articleId,
            },
            orderBy: undefined,
        });

        expect(prismaMock.comment.count).not.toHaveBeenCalled();

        expect(result).toEqual([commentResponse]);
    });

    it('should return paginated comments', async () => {
        prismaMock.comment.count.mockResolvedValue(12);
        prismaMock.comment.findMany.mockResolvedValue([dbComment]);

        var result = await service.findAll({
            articleId,
            page: 2,
            limit: 5,
        });

        expect(prismaMock.comment.count).toHaveBeenCalledWith({
            where: {
                articleId,
            },
        });

        expect(prismaMock.comment.findMany).toHaveBeenCalledWith({
            where: {
                articleId,
            },
            orderBy: undefined,
            skip: 5,
            take: 5,
        });

        expect(result).toEqual({
            total: 12,
            page: 2,
            limit: 5,
            data: [commentResponse],
        });
    });

    it('should return paginated comments with sorting', async () => {
        prismaMock.comment.count.mockResolvedValue(12);
        prismaMock.comment.findMany.mockResolvedValue([dbComment]);

        var result = await service.findAll({
            articleId,
            page: 2,
            limit: 5,
            sortBy: 'createdAt',
            order: 'desc',
        });

        expect(prismaMock.comment.count).toHaveBeenCalledWith({
            where: {
                articleId,
            },
        });

        expect(prismaMock.comment.findMany).toHaveBeenCalledWith({
            where: {
                articleId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip: 5,
            take: 5,
        });

        expect(result).toEqual({
            total: 12,
            page: 2,
            limit: 5,
            data: [commentResponse],
        });
    });

    it('should use ascending sorting by default when sortBy is provided without order', async () => {
        prismaMock.comment.count.mockResolvedValue(1);
        prismaMock.comment.findMany.mockResolvedValue([dbComment]);

        var result = await service.findAll({
            articleId,
            sortBy: 'content',
        });

        expect(prismaMock.comment.count).toHaveBeenCalledWith({
            where: {
                articleId,
            },
        });

        expect(prismaMock.comment.findMany).toHaveBeenCalledWith({
            where: {
                articleId,
            },
            orderBy: {
                content: 'asc',
            },
            skip: 0,
            take: 1,
        });

        expect(result).toEqual({
            total: 1,
            page: 1,
            limit: 1,
            data: [commentResponse],
        });
    });

    it('should use default page and total as limit when only order is provided', async () => {
        prismaMock.comment.count.mockResolvedValue(3);
        prismaMock.comment.findMany.mockResolvedValue([dbComment]);

        var result = await service.findAll({
            articleId,
            order: 'desc',
        });

        expect(prismaMock.comment.count).toHaveBeenCalledWith({
            where: {
                articleId,
            },
        });

        expect(prismaMock.comment.findMany).toHaveBeenCalledWith({
            where: {
                articleId,
            },
            orderBy: undefined,
            skip: 0,
            take: 3,
        });

        expect(result).toEqual({
            total: 3,
            page: 1,
            limit: 3,
            data: [commentResponse],
        });
    });

    it('should use limit 1 when total is zero and limit is not provided', async () => {
        prismaMock.comment.count.mockResolvedValue(0);
        prismaMock.comment.findMany.mockResolvedValue([]);

        var result = await service.findAll({
            articleId,
            page: 1,
        });

        expect(prismaMock.comment.findMany).toHaveBeenCalledWith({
            where: {
                articleId,
            },
            orderBy: undefined,
            skip: 0,
            take: 1,
        });

        expect(result).toEqual({
            total: 0,
            page: 1,
            limit: 1,
            data: [],
        });
    });

    it('should find one comment by id', async () => {
        prismaMock.comment.findUnique.mockResolvedValue(dbComment);

        var result = await service.findOne(commentId);

        expect(prismaMock.comment.findUnique).toHaveBeenCalledWith({
            where: {
                id: commentId,
            },
        });

        expect(result).toEqual(commentResponse);
    });

    it('should throw NotFoundException when comment does not exist', async () => {
        prismaMock.comment.findUnique.mockResolvedValue(null);

        await expect(service.findOne(commentId)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('should remove comment by id', async () => {
        prismaMock.comment.findUnique.mockResolvedValue(dbComment);
        prismaMock.comment.delete.mockResolvedValue(dbComment);

        await service.remove(commentId);

        expect(prismaMock.comment.findUnique).toHaveBeenCalledWith({
            where: {
                id: commentId,
            },
        });

        expect(prismaMock.comment.delete).toHaveBeenCalledWith({
            where: {
                id: commentId,
            },
        });
    });

    it('should throw NotFoundException when removing missing comment', async () => {
        prismaMock.comment.findUnique.mockResolvedValue(null);

        await expect(service.remove(commentId)).rejects.toBeInstanceOf(
            NotFoundException,
        );

        expect(prismaMock.comment.delete).not.toHaveBeenCalled();
    });

    it('should remove comments by articleId', async () => {
        prismaMock.comment.deleteMany.mockResolvedValue({
            count: 2,
        });

        await service.removeByArticleId(articleId);

        expect(prismaMock.comment.deleteMany).toHaveBeenCalledWith({
            where: {
                articleId,
            },
        });
    });

    it('should remove comments by authorId', async () => {
        prismaMock.comment.deleteMany.mockResolvedValue({
            count: 2,
        });

        await service.removeByAuthorId(authorId);

        expect(prismaMock.comment.deleteMany).toHaveBeenCalledWith({
            where: {
                authorId,
            },
        });
    });
});