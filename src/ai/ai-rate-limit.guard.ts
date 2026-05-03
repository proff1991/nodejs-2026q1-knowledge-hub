import {
    CanActivate
    , ExecutionContext
    , HttpException
    , HttpStatus
    , Injectable
} from "@nestjs/common";
import { Response } from "express";

type RateLimitBucket = {
    count: number;
    resetAt: number;
};

@Injectable()
export class AiRateLimitGuard implements CanActivate {
    private readonly buckets = new Map<string, RateLimitBucket>();

    canActivate(context: ExecutionContext): boolean {
        var request = context.switchToHttp().getRequest();
        var response = context.switchToHttp().getResponse<Response>();
        var key = this.getKey(request);
        var limit = this.getLimit();
        var now = Date.now();
        var bucket = this.buckets.get(key);

        if (!bucket || bucket.resetAt <= now) {
            this.buckets.set(key, {
                count: 1,
                resetAt: now + 60000,
            });

            return true;
        }

        if (bucket.count >= limit) {
            var retryAfter = Math.ceil((bucket.resetAt - now) / 1000);

            response.setHeader("Retry-After", String(retryAfter));

            throw new HttpException(
                {
                    message: "AI rate limit exceeded",
                    error: "Too Many Requests",
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        bucket.count++;

        return true;
    }

    private getKey(request: any): string {
        var userId = request.user?.userId;

        if (userId) {
            return `user:${userId}`;
        }

        return `ip:${request.ip ?? "unknown"}`;
    }

    private getLimit(): number {
        var limit = Number(process.env.AI_RATE_LIMIT_RPM ?? 20);

        if (!Number.isFinite(limit) || limit <= 0) {
            return 20;
        }

        return limit;
    }
}