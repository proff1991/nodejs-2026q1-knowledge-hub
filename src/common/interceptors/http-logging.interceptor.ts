import {
    CallHandler
    , ExecutionContext
    , HttpException
    , Injectable
    , NestInterceptor
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AppLoggerService } from '../logger/app-logger.service';

type LoggedRequest = {
    method?: string;
    originalUrl?: string;
    url?: string;
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: unknown;
    headers?: Record<string, unknown>;
};

type LoggedResponse = {
    statusCode?: number;
};

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
    private readonly contextName = 'HttpLoggingInterceptor';

    constructor(private readonly logger: AppLoggerService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        var httpContext = context.switchToHttp();
        var request = httpContext.getRequest<LoggedRequest>();
        var response = httpContext.getResponse<LoggedResponse>();
        var startedAt = Date.now();

        this.logger.log('Incoming request', this.contextName, {
            method: request.method,
            url: this.getRequestUrl(request),
            params: request.params ?? {},
            query: request.query ?? {},
            body: request.body,
            headers: request.headers ?? {},
        });

        return next.handle().pipe(
            tap(() => {
                this.logger.log('Outgoing response', this.contextName, {
                    method: request.method,
                    url: this.getRequestUrl(request),
                    statusCode: response.statusCode,
                    durationMs: Date.now() - startedAt,
                });
            }),
            catchError((error: unknown) => {
                this.logger.error(
                    'Request failed',
                    this.getErrorStack(error),
                    this.contextName,
                    {
                        method: request.method,
                        url: this.getRequestUrl(request),
                        statusCode: this.getErrorStatus(error),
                        durationMs: Date.now() - startedAt,
                        error: this.getErrorMessage(error),
                    },
                );

                return throwError(() => error);
            }),
        );
    }

    private getRequestUrl(request: LoggedRequest): string {
        return request.originalUrl ?? request.url ?? '';
    }

    private getErrorStatus(error: unknown): number {
        if (error instanceof HttpException) {
            return error.getStatus();
        }

        return 500;
    }

    private getErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        return String(error);
    }

    private getErrorStack(error: unknown): string {
        if (error instanceof Error && typeof error.stack === 'string') {
            return error.stack;
        }

        return 'No stack trace';
    }
}