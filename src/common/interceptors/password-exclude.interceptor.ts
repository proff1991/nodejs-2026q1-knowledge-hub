import {
    CallHandler
    , ExecutionContext
    , Injectable
    , NestInterceptor
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class PasswordExcludeInterceptor implements NestInterceptor {
    intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
        return next.handle().pipe(
            map((data: unknown) => this.excludePassword(data)),
        );
    }

    private excludePassword(data: unknown): unknown {
        if (Array.isArray(data)) {
            return data.map((item) => this.excludePassword(item));
        }

        if (data instanceof Date) {
            return data;
        }

        if (data !== null && typeof data === 'object') {
            var result: Record<string, unknown> = {};

            Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
                if (key !== 'password') {
                    result[key] = this.excludePassword(value);
                }
            });

            return result;
        }

        return data;
    }
}