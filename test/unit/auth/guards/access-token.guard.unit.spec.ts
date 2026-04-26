import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessTokenGuard } from '../../../../src/auth/guards/access-token.guard';
import { UserRole } from '../../../../src/user/dto/create-user.dto';

type MockFunction = ReturnType<typeof vi.fn>;

type MockRequest = {
    path?: string;
    originalUrl?: string;
    headers: {
        authorization?: string;
    };
    user?: {
        userId: string;
        login: string;
        role: UserRole;
    };
};

describe('AccessTokenGuard', () => {
    var guard: AccessTokenGuard;

    var reflectorMock: {
        getAllAndOverride: MockFunction;
    };

    var jwtMock: {
        verifyAsync: MockFunction;
    };

    var handler = {};
    var controller = {};

    var createContext = (request: MockRequest): ExecutionContext =>
        ({
            switchToHttp: () => ({
                getRequest: () => request,
            }),
            getHandler: () => handler,
            getClass: () => controller,
        }) as unknown as ExecutionContext;

    beforeEach(async () => {
        process.env.JWT_SECRET = 'access-secret';
        delete process.env.JWT_SECRET_KEY;

        reflectorMock = {
            getAllAndOverride: vi.fn().mockReturnValue(false),
        };

        jwtMock = {
            verifyAsync: vi.fn(),
        };

        var moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AccessTokenGuard,
                {
                    provide: Reflector,
                    useValue: reflectorMock,
                },
                {
                    provide: JwtService,
                    useValue: jwtMock,
                },
            ],
        }).compile();

        guard = moduleRef.get<AccessTokenGuard>(AccessTokenGuard);

        vi.clearAllMocks();
    });

    it('should allow Swagger path without token', async () => {
        var request: MockRequest = {
            path: '/doc',
            headers: {},
        };

        var result = await guard.canActivate(createContext(request));

        expect(result).toBe(true);
        expect(reflectorMock.getAllAndOverride).not.toHaveBeenCalled();
        expect(jwtMock.verifyAsync).not.toHaveBeenCalled();
    });

    it('should allow public route without token', async () => {
        reflectorMock.getAllAndOverride.mockReturnValue(true);

        var request: MockRequest = {
            path: '/auth/login',
            headers: {},
        };

        var result = await guard.canActivate(createContext(request));

        expect(result).toBe(true);
        expect(reflectorMock.getAllAndOverride).toHaveBeenCalled();
        expect(jwtMock.verifyAsync).not.toHaveBeenCalled();
    });

    it('should allow request with valid bearer token and attach user to request', async () => {
        var payload = {
            userId: '550e8400-e29b-41d4-a716-446655440000',
            login: 'alex',
            role: UserRole.ADMIN,
        };

        jwtMock.verifyAsync.mockResolvedValue(payload);

        var request: MockRequest = {
            path: '/user',
            headers: {
                authorization: 'Bearer access-token',
            },
        };

        var result = await guard.canActivate(createContext(request));

        expect(result).toBe(true);

        expect(jwtMock.verifyAsync).toHaveBeenCalledWith('access-token', {
            secret: 'access-secret',
        });

        expect(request.user).toEqual(payload);
    });

    it('should use JWT_SECRET_KEY fallback when JWT_SECRET is missing', async () => {
        delete process.env.JWT_SECRET;
        process.env.JWT_SECRET_KEY = 'fallback-secret';

        jwtMock.verifyAsync.mockResolvedValue({
            userId: '550e8400-e29b-41d4-a716-446655440000',
            login: 'alex',
            role: UserRole.VIEWER,
        });

        var request: MockRequest = {
            path: '/article',
            headers: {
                authorization: 'Bearer access-token',
            },
        };

        await guard.canActivate(createContext(request));

        expect(jwtMock.verifyAsync).toHaveBeenCalledWith('access-token', {
            secret: 'fallback-secret',
        });
    });

    it('should throw UnauthorizedException when authorization header is missing', async () => {
        var request: MockRequest = {
            path: '/user',
            headers: {},
        };

        await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
            UnauthorizedException,
        );

        expect(jwtMock.verifyAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when authorization header is malformed', async () => {
        var request: MockRequest = {
            path: '/user',
            headers: {
                authorization: 'Token access-token',
            },
        };

        await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
            UnauthorizedException,
        );

        expect(jwtMock.verifyAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when bearer token is missing', async () => {
        var request: MockRequest = {
            path: '/user',
            headers: {
                authorization: 'Bearer',
            },
        };

        await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
            UnauthorizedException,
        );

        expect(jwtMock.verifyAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token is expired', async () => {
        var error = new Error('jwt expired');
        error.name = 'TokenExpiredError';

        jwtMock.verifyAsync.mockRejectedValue(error);

        var request: MockRequest = {
            path: '/user',
            headers: {
                authorization: 'Bearer expired-token',
            },
        };

        await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
        jwtMock.verifyAsync.mockRejectedValue(new Error('invalid token'));

        var request: MockRequest = {
            path: '/user',
            headers: {
                authorization: 'Bearer invalid-token',
            },
        };

        await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });
});