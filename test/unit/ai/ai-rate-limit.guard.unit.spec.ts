import { ExecutionContext, HttpException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AiRateLimitGuard } from "../../../src/ai/ai-rate-limit.guard";

type MockFunction = ReturnType<typeof vi.fn>;

type MockResponse = {
    setHeader: MockFunction;
};

type MockRequest = {
    ip?: string;
    user?: {
        userId: string;
    };
};

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

describe("AiRateLimitGuard", () => {
    it("should allow requests under configured limit", () => {
        process.env.AI_RATE_LIMIT_RPM = "2";

        var guard = new AiRateLimitGuard();
        var response = {
            setHeader: vi.fn(),
        };
        var context = createContext(
            {
                user: {
                    userId: "user-id",
                },
            },
            response,
        );

        expect(guard.canActivate(context)).toBe(true);
        expect(guard.canActivate(context)).toBe(true);
    });

    it("should block request over configured limit and set Retry-After header", () => {
        process.env.AI_RATE_LIMIT_RPM = "2";

        var guard = new AiRateLimitGuard();
        var response = {
            setHeader: vi.fn(),
        };
        var context = createContext(
            {
                user: {
                    userId: "user-id",
                },
            },
            response,
        );

        guard.canActivate(context);
        guard.canActivate(context);

        expect(() => guard.canActivate(context)).toThrow(HttpException);
        expect(response.setHeader).toHaveBeenCalledWith(
            "Retry-After",
            expect.any(String),
        );
    });

    it("should use ip key when user id is missing", () => {
        process.env.AI_RATE_LIMIT_RPM = "1";

        var guard = new AiRateLimitGuard();
        var response = {
            setHeader: vi.fn(),
        };
        var context = createContext(
            {
                ip: "127.0.0.1",
            },
            response,
        );

        expect(guard.canActivate(context)).toBe(true);
        expect(() => guard.canActivate(context)).toThrow(HttpException);
    });
});