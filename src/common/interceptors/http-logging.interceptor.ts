import {
    CallHandler
    , ExecutionContext
    , HttpException
    , Injectable
    , NestInterceptor
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
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
            })
        );
    }

    private getRequestUrl(request: LoggedRequest): string {
        return request.originalUrl ?? request.url ?? '';
    }

}