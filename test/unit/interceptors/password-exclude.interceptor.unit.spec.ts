import { CallHandler, ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { PasswordExcludeInterceptor } from '../../../src/common/interceptors/password-exclude.interceptor';

describe('PasswordExcludeInterceptor', () => {
    var interceptor = new PasswordExcludeInterceptor();
    var context = {} as ExecutionContext;

    var createCallHandler = (payload: unknown): CallHandler => ({
        handle: () => of(payload),
    });

    it('should remove password field from object response', async () => {
        var result = await firstValueFrom(
            interceptor.intercept(
                context,
                createCallHandler({
                    id: 'user-id',
                    login: 'alex',
                    password: 'secret-password',
                    role: 'viewer',
                }),
            ),
        );

        expect(result).toEqual({
            id: 'user-id',
            login: 'alex',
            role: 'viewer',
        });
    });

    it('should remove password fields from array response', async () => {
        var result = await firstValueFrom(
            interceptor.intercept(
                context,
                createCallHandler([
                    {
                        id: 'first-user-id',
                        login: 'alex',
                        password: 'first-secret',
                    },
                    {
                        id: 'second-user-id',
                        login: 'john',
                        password: 'second-secret',
                    },
                ]),
            ),
        );

        expect(result).toEqual([
            {
                id: 'first-user-id',
                login: 'alex',
            },
            {
                id: 'second-user-id',
                login: 'john',
            },
        ]);
    });

    it('should remove nested password fields', async () => {
        var result = await firstValueFrom(
            interceptor.intercept(
                context,
                createCallHandler({
                    id: 'article-id',
                    title: 'Node.js article',
                    author: {
                        id: 'user-id',
                        login: 'alex',
                        password: 'secret-password',
                    },
                    comments: [
                        {
                            id: 'comment-id',
                            author: {
                                id: 'comment-author-id',
                                login: 'john',
                                password: 'comment-secret',
                            },
                        },
                    ],
                }),
            ),
        );

        expect(result).toEqual({
            id: 'article-id',
            title: 'Node.js article',
            author: {
                id: 'user-id',
                login: 'alex',
            },
            comments: [
                {
                    id: 'comment-id',
                    author: {
                        id: 'comment-author-id',
                        login: 'john',
                    },
                },
            ],
        });
    });

    it('should return primitive values unchanged', async () => {
        await expect(
            firstValueFrom(interceptor.intercept(context, createCallHandler('ok'))),
        ).resolves.toBe('ok');

        await expect(
            firstValueFrom(interceptor.intercept(context, createCallHandler(null))),
        ).resolves.toBeNull();

        await expect(
            firstValueFrom(interceptor.intercept(context, createCallHandler(123))),
        ).resolves.toBe(123);
    });

    it('should keep Date instances unchanged', async () => {
        var date = new Date('2026-04-26T00:00:00.000Z');

        var result = await firstValueFrom(
            interceptor.intercept(
                context,
                createCallHandler({
                    createdAt: date,
                    password: 'secret-password',
                }),
            ),
        );

        expect(result).toEqual({
            createdAt: date,
        });
    });
});