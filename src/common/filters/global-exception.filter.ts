import {
    ArgumentsHost
    , Catch
    , ExceptionFilter
    , HttpException
    , HttpStatus
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/app-logger.service';

type ExceptionResponseObject = {
    statusCode?: number;
    message?: string | string[];
    error?: string;
};

type ErrorResponseBody = {
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
    message: string | string[];
    error: string;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly contextName = 'GlobalExceptionFilter';

    constructor(private readonly logger: AppLoggerService) { }

    catch(exception: unknown, host: ArgumentsHost): void {
        var httpContext = host.switchToHttp();
        var response = httpContext.getResponse<Response>();
        var request = httpContext.getRequest<Request>();

        var statusCode = this.getStatusCode(exception);
        var exceptionResponse = this.getExceptionResponse(exception);
        var responseBody = this.createResponseBody(
            exception,
            exceptionResponse,
            request,
            statusCode,
        );

        this.logException(exception, request, responseBody);

        response.status(statusCode).json(responseBody);
    }

    private getStatusCode(exception: unknown): number {
        if (exception instanceof HttpException) {
            return exception.getStatus();
        }

        return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    private getExceptionResponse(exception: unknown): ExceptionResponseObject {
        if (!(exception instanceof HttpException)) {
            return {
                message: 'Internal server error',
                error: 'Internal Server Error',
            };
        }

        var response = exception.getResponse();

        if (typeof response === 'string') {
            return {
                message: response,
                error: exception.name,
            };
        }

        return response as ExceptionResponseObject;
    }

    private createResponseBody(
        exception: unknown,
        exceptionResponse: ExceptionResponseObject,
        request: Request,
        statusCode: number,
    ): ErrorResponseBody {
        return {
            statusCode,
            timestamp: new Date().toISOString(),
            path: request.originalUrl ?? request.url,
            method: request.method,
            message: this.getResponseMessage(exception, exceptionResponse),
            error: this.getResponseError(exception, exceptionResponse, statusCode),
        };
    }

    private getResponseMessage(
        exception: unknown,
        exceptionResponse: ExceptionResponseObject,
    ): string | string[] {
        if (typeof exceptionResponse.message !== 'undefined') {
            return exceptionResponse.message;
        }

        if (exception instanceof Error && exception instanceof HttpException) {
            return exception.message;
        }

        return 'Internal server error';
    }

    private getResponseError(
        exception: unknown,
        exceptionResponse: ExceptionResponseObject,
        statusCode: number,
    ): string {
        if (typeof exceptionResponse.error === 'string') {
            return exceptionResponse.error;
        }

        if (exception instanceof HttpException) {
            return exception.name;
        }

        if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
            return 'Internal Server Error';
        }

        return 'Error';
    }

    private logException(
        exception: unknown,
        request: Request,
        responseBody: ErrorResponseBody,
    ): void {
        this.logger.error(
            'Exception caught',
            this.getExceptionStack(exception),
            this.contextName,
            {
                method: request.method,
                url: request.originalUrl ?? request.url,
                statusCode: responseBody.statusCode,
                message: responseBody.message,
                error: responseBody.error,
            },
        );
    }

    private getExceptionStack(exception: unknown): string {
        if (exception instanceof Error && typeof exception.stack === 'string') {
            return exception.stack;
        }

        return 'No stack trace';
    }
}