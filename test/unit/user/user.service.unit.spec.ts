import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { UserRole } from '../../../src/user/dto/create-user.dto';
import { UserService } from '../../../src/user/user.service';

vi.mock('bcrypt', () => ({
    hash: vi.fn(),
    compare: vi.fn(),
}));

type MockFunction = ReturnType<typeof vi.fn>;

describe('UserService', () => {
    var service: UserService;

    var prismaMock: {
        user: {
            findFirst: MockFunction;
            create: MockFunction;
            findMany: MockFunction;
            count: MockFunction;
            findUnique: MockFunction;
            update: MockFunction;
            delete: MockFunction;
        };
        article: {
            updateMany: MockFunction;
        };
        comment: {
            deleteMany: MockFunction;
        };
        $transaction: MockFunction;
    };

    var now = new Date('2026-04-26T00:00:00.000Z'); // fixed date

    var dbViewer = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        login: 'alex',
        password: 'hashed-password',
        role: 'VIEWER' as const,
        createdAt: now,
        updatedAt: now,
    };

    var dbAdmin = Object.assign({}, dbViewer, {
        role: 'ADMIN' as const,
    });

    beforeEach(async () => {
        process.env.CRYPT_SALT = '10';

        prismaMock = {
            user: {
                findFirst: vi.fn(),
                create: vi.fn(),
                findMany: vi.fn(),
                count: vi.fn(),
                findUnique: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            article: {
                updateMany: vi.fn(),
            },
            comment: {
                deleteMany: vi.fn(),
            },
            $transaction: vi.fn(),
        };

        var moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: PrismaService,
                    useValue: prismaMock,
                },
            ],
        }).compile();

        service = moduleRef.get<UserService>(UserService);

        vi.clearAllMocks();
    });

    it('should create user with hashed password and default viewer role', async () => {
        (bcrypt.hash as unknown as MockFunction).mockResolvedValue('hashed-password');
        prismaMock.user.findFirst.mockResolvedValue(null);
        prismaMock.user.create.mockResolvedValue(dbViewer);

        var result = await service.create({
            login: 'alex',
            password: 'plain-password',
        });

        expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
            where: {
                login: 'alex',
            },
        });

        expect(bcrypt.hash).toHaveBeenCalledWith('plain-password', 10);

        expect(prismaMock.user.create).toHaveBeenCalledWith({
            data: {
                login: 'alex',
                password: 'hashed-password',
                role: 'VIEWER',
            },
        });

        expect(result).toEqual({
            id: dbViewer.id,
            login: 'alex',
            role: 'viewer',
            createdAt: now.getTime(),
            updatedAt: now.getTime(),
        });

        expect(result).not.toHaveProperty('password');
    });

    it('should create user with admin role', async () => {
        (bcrypt.hash as unknown as MockFunction).mockResolvedValue('hashed-password');
        prismaMock.user.findFirst.mockResolvedValue(null);
        prismaMock.user.create.mockResolvedValue(dbAdmin);

        var result = await service.create({
            login: 'alex',
            password: 'plain-password',
            role: UserRole.ADMIN,
        });

        expect(prismaMock.user.create).toHaveBeenCalledWith({
            data: {
                login: 'alex',
                password: 'hashed-password',
                role: 'ADMIN',
            },
        });

        expect(result.role).toBe('admin');
    });

    it('should throw BadRequestException when login is already taken', async () => {
        prismaMock.user.findFirst.mockResolvedValue(dbViewer);

        await expect(
            service.create({
                login: 'alex',
                password: 'plain-password',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(bcrypt.hash).not.toHaveBeenCalled();
        expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('should return user by id without password', async () => {
        prismaMock.user.findUnique.mockResolvedValue(dbViewer);

        var result = await service.findOne(dbViewer.id);

        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
            where: {
                id: dbViewer.id,
            },
        });

        expect(result).toEqual({
            id: dbViewer.id,
            login: 'alex',
            role: 'viewer',
            createdAt: now.getTime(),
            updatedAt: now.getTime(),
        });

        expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundException when user does not exist', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        await expect(service.findOne(dbViewer.id)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('should throw BadRequestException when update payload is empty', async () => {
        await expect(service.update(dbViewer.id, {})).rejects.toBeInstanceOf(
            BadRequestException,
        );

        expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when only one password field is provided', async () => {
        await expect(
            service.update(dbViewer.id, {
                oldPassword: 'old-password',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating missing user', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        await expect(
            service.update(dbViewer.id, {
                oldPassword: 'old-password',
                newPassword: 'new-password',
            }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw ForbiddenException when old password is wrong', async () => {
        prismaMock.user.findUnique.mockResolvedValue(dbViewer);
        (bcrypt.compare as unknown as MockFunction).mockResolvedValue(false);

        await expect(
            service.update(dbViewer.id, {
                oldPassword: 'wrong-password',
                newPassword: 'new-password',
            }),
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should update user password when old password is correct', async () => {
        var updatedUser = Object.assign({}, dbViewer, {
            password: 'new-hashed-password',
        });

        prismaMock.user.findUnique.mockResolvedValue(dbViewer);
        prismaMock.user.update.mockResolvedValue(updatedUser);
        (bcrypt.compare as unknown as MockFunction).mockResolvedValue(true);
        (bcrypt.hash as unknown as MockFunction).mockResolvedValue(
            'new-hashed-password',
        );

        var result = await service.update(dbViewer.id, {
            oldPassword: 'old-password',
            newPassword: 'new-password',
        });

        expect(bcrypt.compare).toHaveBeenCalledWith(
            'old-password',
            'hashed-password',
        );

        expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 10);

        expect(prismaMock.user.update).toHaveBeenCalledWith({
            where: {
                id: dbViewer.id,
            },
            data: {
                password: 'new-hashed-password',
            },
        });

        expect(result).not.toHaveProperty('password');
    });

    it('should update user role', async () => {
        var updatedUser = Object.assign({}, dbViewer, {
            role: 'EDITOR' as const,
        });

        prismaMock.user.findUnique.mockResolvedValue(dbViewer);
        prismaMock.user.update.mockResolvedValue(updatedUser);

        var result = await service.update(dbViewer.id, {
            role: UserRole.EDITOR,
        });

        expect(prismaMock.user.update).toHaveBeenCalledWith({
            where: {
                id: dbViewer.id,
            },
            data: {
                role: 'EDITOR',
            },
        });

        expect(result.role).toBe('editor');
    });

    it('should remove user inside transaction', async () => {
        var updateArticlesOperation = {};
        var deleteCommentsOperation = {};
        var deleteUserOperation = {};

        prismaMock.user.findUnique.mockResolvedValue(dbViewer);
        prismaMock.article.updateMany.mockReturnValue(updateArticlesOperation);
        prismaMock.comment.deleteMany.mockReturnValue(deleteCommentsOperation);
        prismaMock.user.delete.mockReturnValue(deleteUserOperation);
        prismaMock.$transaction.mockResolvedValue([]);

        await service.remove(dbViewer.id);

        expect(prismaMock.article.updateMany).toHaveBeenCalledWith({
            where: {
                authorId: dbViewer.id,
            },
            data: {
                authorId: null,
            },
        });

        expect(prismaMock.comment.deleteMany).toHaveBeenCalledWith({
            where: {
                authorId: dbViewer.id,
            },
        });

        expect(prismaMock.user.delete).toHaveBeenCalledWith({
            where: {
                id: dbViewer.id,
            },
        });

        expect(prismaMock.$transaction).toHaveBeenCalledWith([
            updateArticlesOperation,
            deleteCommentsOperation,
            deleteUserOperation,
        ]);
    });

    it('should throw NotFoundException when removing missing user', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        await expect(service.remove(dbViewer.id)).rejects.toBeInstanceOf(
            NotFoundException,
        );

        expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
});