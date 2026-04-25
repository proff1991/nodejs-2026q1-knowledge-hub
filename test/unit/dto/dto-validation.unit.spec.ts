import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateArticleDto } from '../../../src/article/dto/create-article.dto';
import { ListArticleQueryDto } from '../../../src/article/dto/list-article-query.dto';
import { UpdateArticleDto } from '../../../src/article/dto/update-article.dto';
import { ArticleStatus } from '../../../src/article/entities/article.entity';
import { LoginDto } from '../../../src/auth/dto/login.dto';
import { LogoutDto } from '../../../src/auth/dto/logout.dto';
import { RefreshDto } from '../../../src/auth/dto/refresh.dto';
import { SignupDto } from '../../../src/auth/dto/signup.dto';
import { CreateCategoryDto } from '../../../src/category/dto/create-category.dto';
import { ListCategoryQueryDto } from '../../../src/category/dto/list-category-query.dto';
import { UpdateCategoryDto } from '../../../src/category/dto/update-category.dto';
import { CreateCommentDto } from '../../../src/comment/dto/create-comment.dto';
import { ListCommentQueryDto } from '../../../src/comment/dto/list-comment-query.dto';
import {
    CreateUserDto
    , UserRole
} from '../../../src/user/dto/create-user.dto';
import { ListUserQueryDto } from '../../../src/user/dto/list-user-query.dto';
import { UpdateUserDto } from '../../../src/user/dto/update-user.dto';

type DtoPayload = Record<string, unknown>;

var validUuid = '550e8400-e29b-41d4-a716-446655440000';

var validateDto = async <T extends object>(
    dtoClass: ClassConstructor<T>,
    payload: DtoPayload,
) => validate(plainToInstance(dtoClass, payload));

var expectValidationToPass = async <T extends object>(
    dtoClass: ClassConstructor<T>,
    payload: DtoPayload,
) => {
    var errors = await validateDto(dtoClass, payload);

    expect(errors).toHaveLength(0);
};

var expectValidationToFail = async <T extends object>(
    dtoClass: ClassConstructor<T>,
    payload: DtoPayload,
) => {
    var errors = await validateDto(dtoClass, payload);

    expect(errors.length).toBeGreaterThan(0);
};

describe('DTO validation', () => {
    describe('CreateUserDto', () => {
        it('should pass with valid payload', async () => {
            await expectValidationToPass(CreateUserDto, {
                login: 'alex',
                password: 'password',
                role: UserRole.ADMIN,
            });
        });

        it('should pass without optional role', async () => {
            await expectValidationToPass(CreateUserDto, {
                login: 'alex',
                password: 'password',
            });
        });

        it('should fail when required fields are missing', async () => {
            await expectValidationToFail(CreateUserDto, {});
        });

        it('should fail when login and password are not strings', async () => {
            await expectValidationToFail(CreateUserDto, {
                login: 123,
                password: true,
            });
        });

        it('should fail when login and password are empty strings', async () => {
            await expectValidationToFail(CreateUserDto, {
                login: '',
                password: '',
            });
        });

        it('should fail when role is invalid', async () => {
            await expectValidationToFail(CreateUserDto, {
                login: 'alex',
                password: 'password',
                role: 'owner',
            });
        });
    });

    describe('UpdateUserDto', () => {
        it('should pass with valid role', async () => {
            await expectValidationToPass(UpdateUserDto, {
                role: UserRole.EDITOR,
            });
        });

        it('should pass with valid password fields', async () => {
            await expectValidationToPass(UpdateUserDto, {
                oldPassword: 'old-password',
                newPassword: 'new-password',
            });
        });

        it('should pass with empty payload because all fields are optional', async () => {
            await expectValidationToPass(UpdateUserDto, {});
        });

        it('should fail when role is invalid', async () => {
            await expectValidationToFail(UpdateUserDto, {
                role: 'owner',
            });
        });

        it('should fail when password fields are empty', async () => {
            await expectValidationToFail(UpdateUserDto, {
                oldPassword: '',
                newPassword: '',
            });
        });

        it('should fail when password fields are not strings', async () => {
            await expectValidationToFail(UpdateUserDto, {
                oldPassword: 123,
                newPassword: true,
            });
        });
    });

    describe('ListUserQueryDto', () => {
        it('should pass with valid query payload', async () => {
            await expectValidationToPass(ListUserQueryDto, {
                page: 1,
                limit: 10,
                sortBy: 'login',
                order: 'asc',
            });
        });

        it('should pass with empty query payload', async () => {
            await expectValidationToPass(ListUserQueryDto, {});
        });

        it('should fail with invalid query payload', async () => {
            await expectValidationToFail(ListUserQueryDto, {
                page: 0,
                limit: 0,
                sortBy: 'unknown',
                order: 'up',
            });
        });
    });

    describe('Auth DTOs', () => {
        it('should pass valid SignupDto', async () => {
            await expectValidationToPass(SignupDto, {
                login: 'alex',
                password: 'password',
            });
        });

        it('should fail invalid SignupDto', async () => {
            await expectValidationToFail(SignupDto, {
                login: '',
                password: 123,
            });
        });

        it('should pass valid LoginDto', async () => {
            await expectValidationToPass(LoginDto, {
                login: 'alex',
                password: 'password',
            });
        });

        it('should fail invalid LoginDto', async () => {
            await expectValidationToFail(LoginDto, {
                login: 123,
                password: '',
            });
        });

        it('should pass valid RefreshDto', async () => {
            await expectValidationToPass(RefreshDto, {
                refreshToken: 'refresh-token',
            });
        });

        it('should fail invalid RefreshDto', async () => {
            await expectValidationToFail(RefreshDto, {
                refreshToken: '',
            });
        });

        it('should pass valid LogoutDto', async () => {
            await expectValidationToPass(LogoutDto, {
                refreshToken: 'refresh-token',
            });
        });

        it('should fail invalid LogoutDto', async () => {
            await expectValidationToFail(LogoutDto, {
                refreshToken: 123,
            });
        });
    });

    describe('CreateArticleDto', () => {
        it('should pass with valid payload', async () => {
            await expectValidationToPass(CreateArticleDto, {
                title: 'Node.js article',
                content: 'Article content',
                status: ArticleStatus.PUBLISHED,
                authorId: validUuid,
                categoryId: validUuid,
                tags: ['nodejs', 'nestjs'],
            });
        });

        it('should pass without optional fields', async () => {
            await expectValidationToPass(CreateArticleDto, {
                title: 'Node.js article',
                content: 'Article content',
            });
        });

        it('should pass with nullable relation ids', async () => {
            await expectValidationToPass(CreateArticleDto, {
                title: 'Node.js article',
                content: 'Article content',
                authorId: null,
                categoryId: null,
            });
        });

        it('should fail when required fields are missing', async () => {
            await expectValidationToFail(CreateArticleDto, {});
        });

        it('should fail when required string fields are empty', async () => {
            await expectValidationToFail(CreateArticleDto, {
                title: '',
                content: '',
            });
        });

        it('should fail when status is invalid', async () => {
            await expectValidationToFail(CreateArticleDto, {
                title: 'Node.js article',
                content: 'Article content',
                status: 'deleted',
            });
        });

        it('should fail when ids are invalid UUIDs', async () => {
            await expectValidationToFail(CreateArticleDto, {
                title: 'Node.js article',
                content: 'Article content',
                authorId: 'not-uuid',
                categoryId: 'not-uuid',
            });
        });

        it('should fail when tags is not array of strings', async () => {
            await expectValidationToFail(CreateArticleDto, {
                title: 'Node.js article',
                content: 'Article content',
                tags: ['nodejs', 123],
            });
        });
    });

    describe('UpdateArticleDto', () => {
        it('should pass with valid payload', async () => {
            await expectValidationToPass(UpdateArticleDto, {
                title: 'Updated title',
                content: 'Updated content',
                status: ArticleStatus.ARCHIVED,
                authorId: validUuid,
                categoryId: validUuid,
                tags: ['nodejs', 'testing'],
            });
        });

        it('should pass with empty payload because all fields are optional', async () => {
            await expectValidationToPass(UpdateArticleDto, {});
        });

        it('should pass with nullable relation ids', async () => {
            await expectValidationToPass(UpdateArticleDto, {
                authorId: null,
                categoryId: null,
            });
        });

        it('should fail when string fields are empty', async () => {
            await expectValidationToFail(UpdateArticleDto, {
                title: '',
                content: '',
            });
        });

        it('should fail when status is invalid', async () => {
            await expectValidationToFail(UpdateArticleDto, {
                status: 'deleted',
            });
        });

        it('should fail when ids are invalid UUIDs', async () => {
            await expectValidationToFail(UpdateArticleDto, {
                authorId: 'not-uuid',
                categoryId: 'not-uuid',
            });
        });

        it('should fail when tags is not array of strings', async () => {
            await expectValidationToFail(UpdateArticleDto, {
                tags: ['nodejs', 123],
            });
        });
    });

    describe('ListArticleQueryDto', () => {
        it('should pass valid query payload', async () => {
            await expectValidationToPass(ListArticleQueryDto, {
                status: ArticleStatus.DRAFT,
                categoryId: validUuid,
                tag: 'nodejs',
                page: 1,
                limit: 10,
                sortBy: 'title',
                order: 'asc',
            });
        });

        it('should pass with empty query payload', async () => {
            await expectValidationToPass(ListArticleQueryDto, {});
        });

        it('should fail invalid query payload', async () => {
            await expectValidationToFail(ListArticleQueryDto, {
                status: 'deleted',
                categoryId: 'not-uuid',
                page: 0,
                limit: 0,
                sortBy: 'unknown',
                order: 'up',
            });
        });
    });

    describe('CreateCategoryDto', () => {
        it('should pass with valid payload', async () => {
            await expectValidationToPass(CreateCategoryDto, {
                name: 'Node.js',
                description: 'Node.js articles',
            });
        });

        it('should fail when required fields are missing', async () => {
            await expectValidationToFail(CreateCategoryDto, {});
        });

        it('should fail when fields are empty', async () => {
            await expectValidationToFail(CreateCategoryDto, {
                name: '',
                description: '',
            });
        });

        it('should fail when fields are not strings', async () => {
            await expectValidationToFail(CreateCategoryDto, {
                name: 123,
                description: true,
            });
        });
    });

    describe('UpdateCategoryDto', () => {
        it('should pass with valid payload', async () => {
            await expectValidationToPass(UpdateCategoryDto, {
                name: 'Node.js',
                description: 'Node.js articles',
            });
        });

        it('should pass with empty payload because all fields are optional', async () => {
            await expectValidationToPass(UpdateCategoryDto, {});
        });

        it('should fail when fields are empty', async () => {
            await expectValidationToFail(UpdateCategoryDto, {
                name: '',
                description: '',
            });
        });

        it('should fail when fields are not strings', async () => {
            await expectValidationToFail(UpdateCategoryDto, {
                name: 123,
                description: true,
            });
        });
    });

    describe('ListCategoryQueryDto', () => {
        it('should pass with valid query payload', async () => {
            await expectValidationToPass(ListCategoryQueryDto, {
                page: 1,
                limit: 10,
                sortBy: 'name',
                order: 'asc',
            });
        });

        it('should pass with empty query payload', async () => {
            await expectValidationToPass(ListCategoryQueryDto, {});
        });

        it('should fail invalid query payload', async () => {
            await expectValidationToFail(ListCategoryQueryDto, {
                page: 0,
                limit: 0,
                sortBy: 'unknown',
                order: 'up',
            });
        });
    });

    describe('CreateCommentDto', () => {
        it('should pass with valid payload', async () => {
            await expectValidationToPass(CreateCommentDto, {
                content: 'Useful article',
                articleId: validUuid,
                authorId: validUuid,
            });
        });

        it('should pass without optional authorId', async () => {
            await expectValidationToPass(CreateCommentDto, {
                content: 'Useful article',
                articleId: validUuid,
            });
        });

        it('should pass with nullable authorId', async () => {
            await expectValidationToPass(CreateCommentDto, {
                content: 'Useful article',
                articleId: validUuid,
                authorId: null,
            });
        });

        it('should fail when required fields are missing', async () => {
            await expectValidationToFail(CreateCommentDto, {});
        });

        it('should fail when content is empty', async () => {
            await expectValidationToFail(CreateCommentDto, {
                content: '',
                articleId: validUuid,
            });
        });

        it('should fail when articleId is invalid UUID', async () => {
            await expectValidationToFail(CreateCommentDto, {
                content: 'Useful article',
                articleId: 'not-uuid',
            });
        });

        it('should fail when authorId is invalid UUID', async () => {
            await expectValidationToFail(CreateCommentDto, {
                content: 'Useful article',
                articleId: validUuid,
                authorId: 'not-uuid',
            });
        });
    });

    describe('ListCommentQueryDto', () => {
        it('should pass with valid query payload', async () => {
            await expectValidationToPass(ListCommentQueryDto, {
                articleId: validUuid,
                page: 1,
                limit: 10,
                sortBy: 'createdAt',
                order: 'desc',
            });
        });

        it('should fail without required articleId', async () => {
            await expectValidationToFail(ListCommentQueryDto, {});
        });

        it('should fail invalid query payload', async () => {
            await expectValidationToFail(ListCommentQueryDto, {
                articleId: 'not-uuid',
                page: 0,
                limit: 0,
                sortBy: 'unknown',
                order: 'up',
            });
        });
    });
});