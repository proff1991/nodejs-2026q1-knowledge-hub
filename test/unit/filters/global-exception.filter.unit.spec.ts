import {
    ArgumentsHost
    , BadRequestException
    , HttpException
    , HttpStatus
    , NotFoundException
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GlobalExceptionFilter } from '../../../src/common/filters/global-exception.filter';
import { AppLoggerService } from '../../../src/common/logger/app-logger.service';

type MockFunction = ReturnType<typeof vi.fn>;

type MockRequest = {
    method: string;
    originalUrl?: string;
    url: string;
};

type MockResponse = {
    status: MockFunction;
    json: MockFunction;
};

var createHost = (
    request: MockRequest,
    response: MockResponse,
): ArgumentsHost =>
    ({
        switchToHttp: () => ({
            getRequest: () => request,
            getResponse: () => response,
        }),
    }) as unknown as ArgumentsHost;

var createResponse = (): MockResponse => {
    var response = {
        status: vi.fn(),
        json: vi.fn(),
    };

    response.status.mockReturnValue(response);

    return response;
};

var createLogger = (): {
    error: MockFunction;
} => ({
    error: vi.fn(),
});

describe('GlobalExceptionFilter', () => {
    it('should handle standard HttpException response object', () => {
        var logger = createLogger();
        var filter = new GlobalExceptionFilter(
            logger as unknown as AppLoggerService,
        );

        var request = {
            method: 'GET',
            originalUrl: '/article/not-existing-id',
            url: '/article/not-existing-id',
        };

        var response = createResponse();

        filter.catch(
            new NotFoundException('Article not found'),
            createHost(request, response),
        );

        expect(response.status).toHaveBeenCalledWith(404);
        expect(response.json).toHaveBeenCalledWith({
            statusCode: 404,
            timestamp: expect.any(String),
            path: '/article/not-existing-id',
            method: 'GET',
            message: 'Article not found',
            error: 'Not Found',
        });

        expect(logger.error).toHaveBeenCalledWith(
            'Exception caught',
            expect.any(String),
            'GlobalExceptionFilter',
            {
                method: 'GET',
                url: '/article/not-existing-id',
                statusCode: 404,
                message: 'Article not found',
                error: 'Not Found',
            },
        );
    });

    it('should handle validation error message array', () => {
        var logger = createLogger();
        var filter = new GlobalExceptionFilter(
            logger as unknown as AppLoggerService,
        );

        var request = {
            method: 'POST',
            originalUrl: '/auth/login',
            url: '/auth/login',
        };

        var response = createResponse();

        filter.catch(
            new BadRequestException([
                'login must be a string',
                'password must be a string',
            ]),
            createHost(request, response),
        );

        expect(response.status).toHaveBeenCalledWith(400);
        expect(response.json).toHaveBeenCalledWith({
            statusCode: 400,
            timestamp: expect.any(String),
            path: '/auth/login',
            method: 'POST',
            message: [
                'login must be a string',
                'password must be a string',
            ],
            error: 'Bad Request',
        });
    });

    it('should handle HttpException with string response', () => {
        var logger = createLogger();
        var filter = new GlobalExceptionFilter(
            logger as unknown as AppLoggerService,
        );

        var request = {
            method: 'GET',
            url: '/custom-error',
        };

        var response = createResponse();

        filter.catch(
            new HttpException('Custom error', HttpStatus.CONFLICT),
            createHost(request, response),
        );

        expect(response.status).toHaveBeenCalledWith(409);
        expect(response.json).toHaveBeenCalledWith({
            statusCode: 409,
            timestamp: expect.any(String),
            path: '/custom-error',
            method: 'GET',
            message: 'Custom error',
            error: 'HttpException',
        });
    });

    it('should handle unknown errors with generic 500 response', () => {
        var logger = createLogger();
        var filter = new GlobalExceptionFilter(
            logger as unknown as AppLoggerService,
        );

        var request = {
            method: 'GET',
            originalUrl: '/broken',
            url: '/broken',
        };

        var response = createResponse();
        var error = new Error('Database connection failed');

        filter.catch(error, createHost(request, response));

        expect(response.status).toHaveBeenCalledWith(500);
        expect(response.json).toHaveBeenCalledWith({
            statusCode: 500,
            timestamp: expect.any(String),
            path: '/broken',
            method: 'GET',
            message: 'Internal server error',
            error: 'Internal Server Error',
        });

        expect(logger.error).toHaveBeenCalledWith(
            'Exception caught',
            expect.any(String),
            'GlobalExceptionFilter',
            {
                method: 'GET',
                url: '/broken',
                statusCode: 500,
                message: 'Internal server error',
                error: 'Internal Server Error',
            },
        );
    });

    it('should handle non-error thrown values', () => {
        var logger = createLogger();
        var filter = new GlobalExceptionFilter(
            logger as unknown as AppLoggerService,
        );

        var request = {
            method: 'GET',
            originalUrl: '/broken',
            url: '/broken',
        };

        var response = createResponse();

        filter.catch('plain string error', createHost(request, response));

        expect(response.status).toHaveBeenCalledWith(500);
        expect(response.json).toHaveBeenCalledWith({
            statusCode: 500,
            timestamp: expect.any(String),
            path: '/broken',
            method: 'GET',
            message: 'Internal server error',
            error: 'Internal Server Error',
        });

        expect(logger.error).toHaveBeenCalledWith(
            'Exception caught',
            'No stack trace',
            'GlobalExceptionFilter',
            {
                method: 'GET',
                url: '/broken',
                statusCode: 500,
                message: 'Internal server error',
                error: 'Internal Server Error',
            },
        );
    });
});