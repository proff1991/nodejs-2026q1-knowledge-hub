import {
    BadRequestException
    , ForbiddenException
    , UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../src/auth/auth.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { UserRole } from '../../../src/user/dto/create-user.dto';

vi.mock('bcrypt', () => ({
    hash: vi.fn(),
    compare: vi.fn(),
}));

type MockFunction = ReturnType<typeof vi.fn>;

describe('AuthService', () => {
    var service: AuthService;

    var prismaMock: {
        user: {
            findFirst: MockFunction;
            findUnique: MockFunction;
            create: MockFunction;
        };
        refreshToken: {
            findMany: MockFunction;
            create: MockFunction;
            update: MockFunction;
        };
    };

    var jwtMock: {
        signAsync: MockFunction;
        verifyAsync: MockFunction;
    };

    var now = new Date('2026-04-26T00:00:00.000Z');
    var userId = '550e8400-e29b-41d4-a716-446655440000';

    var dbViewer = {
        id: userId,
        login: 'alex',
        password: 'hashed-password',
        role: 'VIEWER' as const,
        createdAt: now,
        updatedAt: now,
    };

    var dbAdmin = Object.assign({}, dbViewer, {
        role: 'ADMIN' as const,
    });

    var tokenPayload = {
        userId,
        login: 'alex',
        role: UserRole.VIEWER,
        exp: 1777161600,
    };

    var storedRefreshToken = {
        id: '550e8400-e29b-41d4-a716-446655440111',
        userId,
        tokenHash: 'stored-refresh-token-hash',
        revokedAt: null,
        expiresAt: new Date('2026-04-27T00:00:00.000Z'),
        createdAt: now,
    };

    beforeEach(async () => {
        process.env.CRYPT_SALT = '10';
        process.env.JWT_SECRET = 'access-secret';
        process.env.JWT_REFRESH_SECRET = 'refresh-secret';
        process.env.JWT_ACCESS_TTL = '15m';
        process.env.JWT_REFRESH_TTL = '7d';

        prismaMock = {
            user: {
                findFirst: vi.fn(),
                findUnique: vi.fn(),
                create: vi.fn(),
            },
            refreshToken: {
                findMany: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
            },
        };

        jwtMock = {
            signAsync: vi.fn(),
            verifyAsync: vi.fn(),
        };

        var moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: PrismaService,
                    useValue: prismaMock,
                },
                {
                    provide: JwtService,
                    useValue: jwtMock,
                },
            ],
        }).compile();

        service = moduleRef.get<AuthService>(AuthService);

        vi.clearAllMocks();
    });

    it('should signup user with hashed password and viewer role', async () => {
        prismaMock.user.findFirst.mockResolvedValue(null);
        prismaMock.user.create.mockResolvedValue(dbViewer);
        (bcrypt.hash as unknown as MockFunction).mockResolvedValue(
            'hashed-password',
        );

        var result = await service.signup({
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
            id: userId,
            login: 'alex',
            role: 'viewer',
            createdAt: now.getTime(),
            updatedAt: now.getTime(),
        });

        expect(result).not.toHaveProperty('password');
    });

    it('should throw BadRequestException when signup login already exists', async () => {
        prismaMock.user.findFirst.mockResolvedValue(dbViewer);

        await expect(
            service.signup({
                login: 'alex',
                password: 'plain-password',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(bcrypt.hash).not.toHaveBeenCalled();
        expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('should login user, generate tokens and store refresh token hash', async () => {
        prismaMock.user.findFirst.mockResolvedValue(dbAdmin);
        prismaMock.refreshToken.create.mockResolvedValue({});
        jwtMock.signAsync
            .mockResolvedValueOnce('access-token')
            .mockResolvedValueOnce('refresh-token');
        jwtMock.verifyAsync.mockResolvedValue(
            Object.assign({}, tokenPayload, {
                role: UserRole.ADMIN,
            }),
        );
        (bcrypt.compare as unknown as MockFunction).mockResolvedValue(true);
        (bcrypt.hash as unknown as MockFunction).mockResolvedValue(
            'refresh-token-hash',
        );

        var result = await service.login({
            login: 'alex',
            password: 'plain-password',
        });

        expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
            where: {
                login: 'alex',
            },
        });

        expect(bcrypt.compare).toHaveBeenCalledWith(
            'plain-password',
            'hashed-password',
        );

        expect(jwtMock.signAsync).toHaveBeenNthCalledWith(
            1,
            {
                userId,
                login: 'alex',
                role: UserRole.ADMIN,
            },
            {
                secret: 'access-secret',
                expiresIn: '15m',
            },
        );

        expect(jwtMock.signAsync).toHaveBeenNthCalledWith(
            2,
            {
                userId,
                login: 'alex',
                role: UserRole.ADMIN,
            },
            {
                secret: 'refresh-secret',
                expiresIn: '7d',
            },
        );

        expect(jwtMock.verifyAsync).toHaveBeenCalledWith('refresh-token', {
            secret: 'refresh-secret',
        });

        expect(bcrypt.hash).toHaveBeenCalledWith('refresh-token', 10);

        expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
            data: {
                userId,
                tokenHash: 'refresh-token-hash',
                expiresAt: new Date(tokenPayload.exp * 1000),
            },
        });

        expect(result).toEqual({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        });
    });

    it('should throw ForbiddenException when login user does not exist', async () => {
        prismaMock.user.findFirst.mockResolvedValue(null);

        await expect(
            service.login({
                login: 'alex',
                password: 'plain-password',
            }),
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(jwtMock.signAsync).not.toHaveBeenCalled();
        expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when login password is wrong', async () => {
        prismaMock.user.findFirst.mockResolvedValue(dbViewer);
        (bcrypt.compare as unknown as MockFunction).mockResolvedValue(false);

        await expect(
            service.login({
                login: 'alex',
                password: 'wrong-password',
            }),
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(jwtMock.signAsync).not.toHaveBeenCalled();
        expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when generated refresh token has no expiration', async () => {
        prismaMock.user.findFirst.mockResolvedValue(dbViewer);
        jwtMock.signAsync
            .mockResolvedValueOnce('access-token')
            .mockResolvedValueOnce('refresh-token');
        jwtMock.verifyAsync.mockResolvedValue({
            userId,
            login: 'alex',
            role: UserRole.VIEWER,
        });
        (bcrypt.compare as unknown as MockFunction).mockResolvedValue(true);

        await expect(
            service.login({
                login: 'alex',
                password: 'plain-password',
            }),
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
    });

    it('should refresh tokens and revoke used refresh token', async () => {
        prismaMock.user.findUnique.mockResolvedValue(dbViewer);
        prismaMock.refreshToken.findMany.mockResolvedValue([storedRefreshToken]);
        prismaMock.refreshToken.update.mockResolvedValue({});
        prismaMock.refreshToken.create.mockResolvedValue({});
        jwtMock.verifyAsync.mockResolvedValue(tokenPayload);
        jwtMock.signAsync
            .mockResolvedValueOnce('new-access-token')
            .mockResolvedValueOnce('new-refresh-token');
        (bcrypt.compare as unknown as MockFunction).mockResolvedValue(true);
        (bcrypt.hash as unknown as MockFunction).mockResolvedValue(
            'new-refresh-token-hash',
        );

        var result = await service.refresh({
            refreshToken: 'old-refresh-token',
        });

        expect(jwtMock.verifyAsync).toHaveBeenCalledWith('old-refresh-token', {
            secret: 'refresh-secret',
        });

        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
            where: {
                id: userId,
            },
        });

        expect(prismaMock.refreshToken.findMany).toHaveBeenCalledWith({
            where: {
                userId,
                revokedAt: null,
                expiresAt: {
                    gt: expect.any(Date),
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        expect(bcrypt.compare).toHaveBeenCalledWith(
            'old-refresh-token',
            'stored-refresh-token-hash',
        );

        expect(prismaMock.refreshToken.update).toHaveBeenCalledWith({
            where: {
                id: storedRefreshToken.id,
            },
            data: {
                revokedAt: expect.any(Date),
            },
        });

        expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
            data: {
                userId,
                tokenHash: 'new-refresh-token-hash',
                expiresAt: new Date(tokenPayload.exp * 1000),
            },
        });

        expect(result).toEqual({
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
        });
    });

    it('should throw UnauthorizedException when refresh token is missing', async () => {
        await expect(service.refresh({})).rejects.toBeInstanceOf(
            UnauthorizedException,
        );

        await expect(
            service.refresh({
                refreshToken: '',
            }),
        ).rejects.toBeInstanceOf(UnauthorizedException);

        expect(jwtMock.verifyAsync).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when refresh token is invalid or expired', async () => {
        jwtMock.verifyAsync.mockRejectedValue(new Error('jwt expired'));

        await expect(
            service.refresh({
                refreshToken: 'expired-refresh-token',
            }),
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.refreshToken.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when refresh token payload user does not exist', async () => {
        jwtMock.verifyAsync.mockResolvedValue(tokenPayload);
        prismaMock.user.findUnique.mockResolvedValue(null);

        await expect(
            service.refresh({
                refreshToken: 'refresh-token',
            }),
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(prismaMock.refreshToken.findMany).not.toHaveBeenCalled();
        expect(prismaMock.refreshToken.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when refresh token payload login does not match user login', async () => {
        jwtMock.verifyAsync.mockResolvedValue(tokenPayload);
        prismaMock.user.findUnique.mockResolvedValue(
            Object.assign({}, dbViewer, {
                login: 'other-login',
            }),
        );

        await expect(
            service.refresh({
                refreshToken: 'refresh-token',
            }),
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(prismaMock.refreshToken.findMany).not.toHaveBeenCalled();
        expect(prismaMock.refreshToken.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when stored refresh token is not found', async () => {
        jwtMock.verifyAsync.mockResolvedValue(tokenPayload);
        prismaMock.user.findUnique.mockResolvedValue(dbViewer);
        prismaMock.refreshToken.findMany.mockResolvedValue([storedRefreshToken]);
        (bcrypt.compare as unknown as MockFunction).mockResolvedValue(false);

        await expect(
            service.refresh({
                refreshToken: 'refresh-token',
            }),
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(prismaMock.refreshToken.update).not.toHaveBeenCalled();
        expect(prismaMock.refreshToken.create).not.toHaveBeenCalled();
    });

    it('should logout and revoke stored refresh token', async () => {
        jwtMock.verifyAsync.mockResolvedValue(tokenPayload);
        prismaMock.refreshToken.findMany.mockResolvedValue([storedRefreshToken]);
        prismaMock.refreshToken.update.mockResolvedValue({});
        (bcrypt.compare as unknown as MockFunction).mockResolvedValue(true);

        var result = await service.logout({
            refreshToken: 'refresh-token',
        });

        expect(jwtMock.verifyAsync).toHaveBeenCalledWith('refresh-token', {
            secret: 'refresh-secret',
        });

        expect(prismaMock.refreshToken.findMany).toHaveBeenCalledWith({
            where: {
                userId,
                revokedAt: null,
                expiresAt: {
                    gt: expect.any(Date),
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        expect(prismaMock.refreshToken.update).toHaveBeenCalledWith({
            where: {
                id: storedRefreshToken.id,
            },
            data: {
                revokedAt: expect.any(Date),
            },
        });

        expect(result).toEqual({
            message: 'Logged out successfully',
        });
    });

    it('should throw UnauthorizedException when logout refresh token is missing', async () => {
        await expect(service.logout({})).rejects.toBeInstanceOf(
            UnauthorizedException,
        );

        await expect(
            service.logout({
                refreshToken: '',
            }),
        ).rejects.toBeInstanceOf(UnauthorizedException);

        expect(jwtMock.verifyAsync).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when logout refresh token is invalid', async () => {
        jwtMock.verifyAsync.mockRejectedValue(new Error('invalid token'));

        await expect(
            service.logout({
                refreshToken: 'invalid-refresh-token',
            }),
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(prismaMock.refreshToken.findMany).not.toHaveBeenCalled();
        expect(prismaMock.refreshToken.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when logout stored token is not found', async () => {
        jwtMock.verifyAsync.mockResolvedValue(tokenPayload);
        prismaMock.refreshToken.findMany.mockResolvedValue([storedRefreshToken]);
        (bcrypt.compare as unknown as MockFunction).mockResolvedValue(false);

        await expect(
            service.logout({
                refreshToken: 'refresh-token',
            }),
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(prismaMock.refreshToken.update).not.toHaveBeenCalled();
    });
});