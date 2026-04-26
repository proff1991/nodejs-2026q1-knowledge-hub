import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RbacGuard } from '../../../../src/auth/guards/rbac.guard';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { UserRole } from '../../../../src/user/dto/create-user.dto';

type MockFunction = ReturnType<typeof vi.fn>;

type MockUser = {
  userId: string;
  login: string;
  role: UserRole;
};

type MockRequest = {
  path?: string;
  originalUrl?: string;
  url?: string;
  method: string;
  headers?: Record<string, string>;
  params: {
    id?: string;
  };
  body: {
    authorId?: string | null;
    [key: string]: unknown;
  };
  user?: MockUser;
};

describe('RbacGuard', () => {
  var guard: RbacGuard;

  var reflectorMock: {
    getAllAndOverride: MockFunction;
  };

  var prismaMock: {
    article: {
      findUnique: MockFunction;
    };
    comment: {
      findUnique: MockFunction;
    };
  };

  var userId = '550e8400-e29b-41d4-a716-446655440000';
  var otherUserId = '550e8400-e29b-41d4-a716-446655440001';
  var resourceId = '550e8400-e29b-41d4-a716-446655440002';

  var handler = {};
  var controller = {};

  var adminUser: MockUser = {
    userId,
    login: 'admin',
    role: UserRole.ADMIN,
  };

  var editorUser: MockUser = {
    userId,
    login: 'editor',
    role: UserRole.EDITOR,
  };

  var viewerUser: MockUser = {
    userId,
    login: 'viewer',
    role: UserRole.VIEWER,
  };

  var createContext = (request: MockRequest): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => handler,
      getClass: () => controller,
    }) as unknown as ExecutionContext;

  var createRequest = (
    method: string,
    originalUrl: string,
    user?: MockUser,
  ): MockRequest => ({
    path: originalUrl,
    originalUrl,
    method,
    params: {
      id: resourceId,
    },
    body: {},
    user,
  });

  beforeEach(async () => {
    reflectorMock = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    };

    prismaMock = {
      article: {
        findUnique: vi.fn(),
      },
      comment: {
        findUnique: vi.fn(),
      },
    };

    var moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RbacGuard,
        {
          provide: Reflector,
          useValue: reflectorMock,
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    guard = moduleRef.get<RbacGuard>(RbacGuard);

    vi.clearAllMocks();
  });

  it('should allow Swagger path without user', async () => {
    var request = createRequest('GET', '/doc');

    var result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(reflectorMock.getAllAndOverride).not.toHaveBeenCalled();
  });

  it('should allow public route without user', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(true);

    var request = createRequest('POST', '/auth/login');

    var result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(reflectorMock.getAllAndOverride).toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when user is missing', async () => {
    var request = createRequest('GET', '/user');

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should allow admin to perform any operation', async () => {
    var request = createRequest('DELETE', '/user/550e8400-e29b-41d4-a716-446655440002', adminUser);

    var result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(prismaMock.article.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.comment.findUnique).not.toHaveBeenCalled();
  });

  it('should allow viewer to read resources', async () => {
    var request = createRequest('GET', '/article', viewerUser);

    var result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
  });

  it('should forbid viewer to create article', async () => {
    var request = createRequest('POST', '/article', viewerUser);

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('should forbid editor to modify users', async () => {
    var request = createRequest('PUT', '/user/550e8400-e29b-41d4-a716-446655440002', editorUser);

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('should forbid editor to modify categories', async () => {
    var request = createRequest('POST', '/category', editorUser);

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('should allow editor to create article and force authorId', async () => {
    var request = createRequest('POST', '/article', editorUser);

    var result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.body.authorId).toBe(userId);
  });

  it('should allow editor to update own article and force authorId', async () => {
    prismaMock.article.findUnique.mockResolvedValue({
      authorId: userId,
    });

    var request = createRequest(
      'PUT',
      '/article/550e8400-e29b-41d4-a716-446655440002',
      editorUser,
    );

    var result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);

    expect(prismaMock.article.findUnique).toHaveBeenCalledWith({
      where: {
        id: resourceId,
      },
      select: {
        authorId: true,
      },
    });

    expect(request.body.authorId).toBe(userId);
  });

  it('should allow editor to delete own article', async () => {
    prismaMock.article.findUnique.mockResolvedValue({
      authorId: userId,
    });

    var request = createRequest(
      'DELETE',
      '/article/550e8400-e29b-41d4-a716-446655440002',
      editorUser,
    );

    var result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);

    expect(prismaMock.article.findUnique).toHaveBeenCalledWith({
      where: {
        id: resourceId,
      },
      select: {
        authorId: true,
      },
    });
  });

  it('should forbid editor to update another author article', async () => {
    prismaMock.article.findUnique.mockResolvedValue({
      authorId: otherUserId,
    });

    var request = createRequest(
      'PUT',
      '/article/550e8400-e29b-41d4-a716-446655440002',
      editorUser,
    );

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('should forbid editor to delete missing article', async () => {
    prismaMock.article.findUnique.mockResolvedValue(null);

    var request = createRequest(
      'DELETE',
      '/article/550e8400-e29b-41d4-a716-446655440002',
      editorUser,
    );

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('should allow editor to create comment and force authorId', async () => {
    var request = createRequest('POST', '/comment', editorUser);

    var result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.body.authorId).toBe(userId);
  });

  it('should allow editor to delete own comment', async () => {
    prismaMock.comment.findUnique.mockResolvedValue({
      authorId: userId,
    });

    var request = createRequest(
      'DELETE',
      '/comment/550e8400-e29b-41d4-a716-446655440002',
      editorUser,
    );

    var result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);

    expect(prismaMock.comment.findUnique).toHaveBeenCalledWith({
      where: {
        id: resourceId,
      },
      select: {
        authorId: true,
      },
    });
  });

  it('should forbid editor to delete another author comment', async () => {
    prismaMock.comment.findUnique.mockResolvedValue({
      authorId: otherUserId,
    });

    var request = createRequest(
      'DELETE',
      '/comment/550e8400-e29b-41d4-a716-446655440002',
      editorUser,
    );

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('should forbid editor to delete missing comment', async () => {
    prismaMock.comment.findUnique.mockResolvedValue(null);

    var request = createRequest(
      'DELETE',
      '/comment/550e8400-e29b-41d4-a716-446655440002',
      editorUser,
    );

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('should forbid unsupported editor resource operation', async () => {
    var request = createRequest('POST', '/unknown', editorUser);

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});