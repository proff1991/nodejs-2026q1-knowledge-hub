import {
    CallHandler
    , ExecutionContext
    , NotFoundException
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { HttpLoggingInterceptor } from '../../../src/common/interceptors/http-logging.interceptor';
import { AppLoggerService } from '../../../src/common/logger/app-logger.service';

type MockFunction = ReturnType<typeof vi.fn>;

type MockRequest = {
    method?: string;
    originalUrl?: string;
    url?: string;
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: unknown;
    headers?: Record<string, unknown>;
};

type MockResponse = {
    statusCode?: number;
};

describe('HttpLoggingInterceptor', () => {
    var createContext = (
        request: MockRequest,
        response: MockResponse,
    ): ExecutionContext =>
        ({
            switchToHttp: () => ({
                getRequest: () => request,
                getResponse: () => response,
            }),
        }) as unknown as ExecutionContext;

    var createCallHandler = (payload: unknown): CallHandler => ({
        handle: () => of(payload),
    });

    var createErrorCallHandler = (error: unknown): CallHandler => ({
        handle: () => throwError(() => error),
    });

    var createLoggerMock = (): {
        log: MockFunction;
        error: MockFunction;
    } => ({
        log: vi.fn(),
        error: vi.fn(),
    });

    it('should log incoming request and outgoing response', async () => {
        var loggerMock = createLoggerMock();
        var interceptor = new HttpLoggingInterceptor(
            loggerMock as unknown as AppLoggerService,
        );

        var request: MockRequest = {
            method: 'POST',
            originalUrl: '/auth/login',
            params: {},
            query: {
                debug: 'true',
            },
            body: {
                login: 'alex',
                password: 'secret-password',
            },
            headers: {
                authorization: 'Bearer access-token',
            },
        };

        var response: MockResponse = {
            statusCode: 201,
        };

        var result = await firstValueFrom(
            interceptor.intercept(
                createContext(request, response),
                createCallHandler({
                    accessToken: 'access-token',
                }),
            ),
        );

        expect(result).toEqual({
            accessToken: 'access-token',
        });

        expect(loggerMock.log).toHaveBeenCalledTimes(2);

        expect(loggerMock.log).toHaveBeenNthCalledWith(
            1,
            'Incoming request',
            'HttpLoggingInterceptor',
            {
                method: 'POST',
                url: '/auth/login',
                params: {},
                query: {
                    debug: 'true',
                },
                body: {
                    login: 'alex',
                    password: 'secret-password',
                },
                headers: {
                    authorization: 'Bearer access-token',
                },
            },
        );

        expect(loggerMock.log).toHaveBeenNthCalledWith(
            2,
            'Outgoing response',
            'HttpLoggingInterceptor',
            {
                method: 'POST',
                url: '/auth/login',
                statusCode: 201,
                durationMs: expect.any(Number),
            },
        );

        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    it('should fallback to url when originalUrl is missing', async () => {
        var loggerMock = createLoggerMock();
        var interceptor = new HttpLoggingInterceptor(
            loggerMock as unknown as AppLoggerService,
        );

        var request: MockRequest = {
            method: 'GET',
            url: '/article',
            headers: {},
        };

        var response: MockResponse = {
            statusCode: 200,
        };

        await firstValueFrom(
            interceptor.intercept(
                createContext(request, response),
                createCallHandler([]),
            ),
        );

        expect(loggerMock.log).toHaveBeenNthCalledWith(
            1,
            'Incoming request',
            'HttpLoggingInterceptor',
            {
                method: 'GET',
                url: '/article',
                params: {},
                query: {},
                body: undefined,
                headers: {},
            },
        );
    });

    it('should log failed request and rethrow error', async () => {
        var loggerMock = createLoggerMock();
        var interceptor = new HttpLoggingInterceptor(
            loggerMock as unknown as AppLoggerService,
        );

        var request: MockRequest = {
            method: 'GET',
            originalUrl: '/article/not-existing-id',
            params: {
                id: 'not-existing-id',
            },
            query: {},
            body: undefined,
            headers: {},
        };

        var response: MockResponse = {
            statusCode: 404,
        };

        var error = new NotFoundException('Article not found');

        await expect(
            firstValueFrom(
                interceptor.intercept(
                    createContext(request, response),
                    createErrorCallHandler(error),
                ),
            ),
        ).rejects.toBe(error);

        expect(loggerMock.log).toHaveBeenCalledTimes(1);

        expect(loggerMock.error).toHaveBeenCalledTimes(1);

        expect(loggerMock.error).toHaveBeenCalledWith(
            'Request failed',
            expect.any(String),
            'HttpLoggingInterceptor',
            {
                method: 'GET',
                url: '/article/not-existing-id',
                statusCode: 404,
                durationMs: expect.any(Number),
                error: 'Article not found',
            },
        );
    });

    it('should use 500 status code for unknown errors', async () => {
        var loggerMock = createLoggerMock();
        var interceptor = new HttpLoggingInterceptor(
            loggerMock as unknown as AppLoggerService,
        );

        var request: MockRequest = {
            method: 'GET',
            originalUrl: '/broken',
            headers: {},
        };

        var response: MockResponse = {
            statusCode: 500,
        };

        var error = new Error('Unexpected failure');

        await expect(
            firstValueFrom(
                interceptor.intercept(
                    createContext(request, response),
                    createErrorCallHandler(error),
                ),
            ),
        ).rejects.toBe(error);

        expect(loggerMock.error).toHaveBeenCalledWith(
            'Request failed',
            expect.any(String),
            'HttpLoggingInterceptor',
            {
                method: 'GET',
                url: '/broken',
                statusCode: 500,
                durationMs: expect.any(Number),
                error: 'Unexpected failure',
            },
        );
    });
});