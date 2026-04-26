import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryService } from '../../../src/category/category.service';
import { PrismaService } from '../../../src/prisma/prisma.service';

type MockFunction = ReturnType<typeof vi.fn>;

describe('CategoryService', () => {
    var service: CategoryService;

    var prismaMock: {
        category: {
            create: MockFunction;
            findMany: MockFunction;
            count: MockFunction;
            findUnique: MockFunction;
            update: MockFunction;
            delete: MockFunction;
        };
    };

    var categoryId = '550e8400-e29b-41d4-a716-446655440000';

    var dbCategory = {
        id: categoryId,
        name: 'Node.js',
        description: 'Articles about Node.js',
    };

    beforeEach(async () => {
        prismaMock = {
            category: {
                create: vi.fn(),
                findMany: vi.fn(),
                count: vi.fn(),
                findUnique: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
        };

        var moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                CategoryService,
                {
                    provide: PrismaService,
                    useValue: prismaMock,
                },
            ],
        }).compile();

        service = moduleRef.get<CategoryService>(CategoryService);

        vi.clearAllMocks();
    });

    it('should create category', async () => {
        prismaMock.category.create.mockResolvedValue(dbCategory);

        var result = await service.create({
            name: 'Node.js',
            description: 'Articles about Node.js',
        });

        expect(prismaMock.category.create).toHaveBeenCalledWith({
            data: {
                name: 'Node.js',
                description: 'Articles about Node.js',
            },
        });

        expect(result).toEqual(dbCategory);
    });

    it('should find all categories without pagination and sorting', async () => {
        prismaMock.category.findMany.mockResolvedValue([dbCategory]);

        var result = await service.findAll();

        expect(prismaMock.category.findMany).toHaveBeenCalledWith({
            orderBy: undefined,
        });

        expect(prismaMock.category.count).not.toHaveBeenCalled();

        expect(result).toEqual([dbCategory]);
    });

    it('should return paginated categories with sorting when sortBy and order are provided', async () => {
        prismaMock.category.count.mockResolvedValue(1);
        prismaMock.category.findMany.mockResolvedValue([dbCategory]);

        var result = await service.findAll({
            sortBy: 'name',
            order: 'desc',
        });

        expect(prismaMock.category.count).toHaveBeenCalledWith();

        expect(prismaMock.category.findMany).toHaveBeenCalledWith({
            orderBy: {
                name: 'desc',
            },
            skip: 0,
            take: 1,
        });

        expect(result).toEqual({
            total: 1,
            page: 1,
            limit: 1,
            data: [dbCategory],
        });
    });;

    it('should use ascending sorting by default when sortBy is provided without order', async () => {
        prismaMock.category.count.mockResolvedValue(1);
        prismaMock.category.findMany.mockResolvedValue([dbCategory]);

        var result = await service.findAll({
            sortBy: 'description',
        });

        expect(prismaMock.category.count).toHaveBeenCalledWith();

        expect(prismaMock.category.findMany).toHaveBeenCalledWith({
            orderBy: {
                description: 'asc',
            },
            skip: 0,
            take: 1,
        });

        expect(result).toEqual({
            total: 1,
            page: 1,
            limit: 1,
            data: [dbCategory],
        });
    });;

    it('should return paginated categories', async () => {
        prismaMock.category.count.mockResolvedValue(12);
        prismaMock.category.findMany.mockResolvedValue([dbCategory]);

        var result = await service.findAll({
            page: 2,
            limit: 5,
        });

        expect(prismaMock.category.count).toHaveBeenCalledWith();

        expect(prismaMock.category.findMany).toHaveBeenCalledWith({
            orderBy: undefined,
            skip: 5,
            take: 5,
        });

        expect(result).toEqual({
            total: 12,
            page: 2,
            limit: 5,
            data: [dbCategory],
        });
    });

    it('should return paginated categories with sorting', async () => {
        prismaMock.category.count.mockResolvedValue(12);
        prismaMock.category.findMany.mockResolvedValue([dbCategory]);

        var result = await service.findAll({
            page: 2,
            limit: 5,
            sortBy: 'name',
            order: 'desc',
        });

        expect(prismaMock.category.count).toHaveBeenCalledWith();

        expect(prismaMock.category.findMany).toHaveBeenCalledWith({
            orderBy: {
                name: 'desc',
            },
            skip: 5,
            take: 5,
        });

        expect(result).toEqual({
            total: 12,
            page: 2,
            limit: 5,
            data: [dbCategory],
        });
    });

    it('should use default page and total as limit when only sorting order is provided', async () => {
        prismaMock.category.count.mockResolvedValue(3);
        prismaMock.category.findMany.mockResolvedValue([dbCategory]);

        var result = await service.findAll({
            order: 'desc',
        });

        expect(prismaMock.category.count).toHaveBeenCalledWith();

        expect(prismaMock.category.findMany).toHaveBeenCalledWith({
            orderBy: undefined,
            skip: 0,
            take: 3,
        });

        expect(result).toEqual({
            total: 3,
            page: 1,
            limit: 3,
            data: [dbCategory],
        });
    });

    it('should use limit 1 when total is zero and limit is not provided', async () => {
        prismaMock.category.count.mockResolvedValue(0);
        prismaMock.category.findMany.mockResolvedValue([]);

        var result = await service.findAll({
            page: 1,
        });

        expect(prismaMock.category.findMany).toHaveBeenCalledWith({
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

    it('should find one category by id', async () => {
        prismaMock.category.findUnique.mockResolvedValue(dbCategory);

        var result = await service.findOne(categoryId);

        expect(prismaMock.category.findUnique).toHaveBeenCalledWith({
            where: {
                id: categoryId,
            },
        });

        expect(result).toEqual(dbCategory);
    });

    it('should throw NotFoundException when category does not exist', async () => {
        prismaMock.category.findUnique.mockResolvedValue(null);

        await expect(service.findOne(categoryId)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('should update category name and description', async () => {
        var updatedCategory = {
            id: categoryId,
            name: 'Nest.js',
            description: 'Articles about Nest.js',
        };

        prismaMock.category.findUnique.mockResolvedValue(dbCategory);
        prismaMock.category.update.mockResolvedValue(updatedCategory);

        var result = await service.update(categoryId, {
            name: 'Nest.js',
            description: 'Articles about Nest.js',
        });

        expect(prismaMock.category.findUnique).toHaveBeenCalledWith({
            where: {
                id: categoryId,
            },
        });

        expect(prismaMock.category.update).toHaveBeenCalledWith({
            where: {
                id: categoryId,
            },
            data: {
                name: 'Nest.js',
                description: 'Articles about Nest.js',
            },
        });

        expect(result).toEqual(updatedCategory);
    });

    it('should update only category name', async () => {
        var updatedCategory = {
            id: categoryId,
            name: 'Nest.js',
            description: 'Articles about Node.js',
        };

        prismaMock.category.findUnique.mockResolvedValue(dbCategory);
        prismaMock.category.update.mockResolvedValue(updatedCategory);

        var result = await service.update(categoryId, {
            name: 'Nest.js',
        });

        expect(prismaMock.category.update).toHaveBeenCalledWith({
            where: {
                id: categoryId,
            },
            data: {
                name: 'Nest.js',
            },
        });

        expect(result).toEqual(updatedCategory);
    });

    it('should update only category description', async () => {
        var updatedCategory = {
            id: categoryId,
            name: 'Node.js',
            description: 'Updated description',
        };

        prismaMock.category.findUnique.mockResolvedValue(dbCategory);
        prismaMock.category.update.mockResolvedValue(updatedCategory);

        var result = await service.update(categoryId, {
            description: 'Updated description',
        });

        expect(prismaMock.category.update).toHaveBeenCalledWith({
            where: {
                id: categoryId,
            },
            data: {
                description: 'Updated description',
            },
        });

        expect(result).toEqual(updatedCategory);
    });

    it('should update category with empty data when payload is empty', async () => {
        prismaMock.category.findUnique.mockResolvedValue(dbCategory);
        prismaMock.category.update.mockResolvedValue(dbCategory);

        var result = await service.update(categoryId, {});

        expect(prismaMock.category.update).toHaveBeenCalledWith({
            where: {
                id: categoryId,
            },
            data: {},
        });

        expect(result).toEqual(dbCategory);
    });

    it('should throw NotFoundException when updating missing category', async () => {
        prismaMock.category.findUnique.mockResolvedValue(null);

        await expect(
            service.update(categoryId, {
                name: 'Nest.js',
            }),
        ).rejects.toBeInstanceOf(NotFoundException);

        expect(prismaMock.category.update).not.toHaveBeenCalled();
    });

    it('should remove category by id', async () => {
        prismaMock.category.findUnique.mockResolvedValue(dbCategory);
        prismaMock.category.delete.mockResolvedValue(dbCategory);

        await service.remove(categoryId);

        expect(prismaMock.category.findUnique).toHaveBeenCalledWith({
            where: {
                id: categoryId,
            },
        });

        expect(prismaMock.category.delete).toHaveBeenCalledWith({
            where: {
                id: categoryId,
            },
        });
    });

    it('should throw NotFoundException when removing missing category', async () => {
        prismaMock.category.findUnique.mockResolvedValue(null);

        await expect(service.remove(categoryId)).rejects.toBeInstanceOf(
            NotFoundException,
        );

        expect(prismaMock.category.delete).not.toHaveBeenCalled();
    });
});