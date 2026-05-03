import { describe, expect, it } from "vitest";
import { AiUsageService } from "../../../src/ai/ai-usage.service";

describe("AiUsageService", () => {
    it("should track requests by endpoint", () => {
        var service = new AiUsageService();

        service.trackRequest("generate");
        service.trackRequest("summarize");
        service.trackRequest("summarize");

        expect(service.getStats()).toEqual({
            startedAt: expect.any(String),
            totalRequests: 3,
            requestsByEndpoint: {
                generate: 1,
                summarize: 2,
                translate: 0,
                analyze: 0,
            },
            tokenUsage: {
                promptTokenCount: 0,
                candidatesTokenCount: 0,
                totalTokenCount: 0,
            },
        });
    });

    it("should track token usage from Gemini metadata", () => {
        var service = new AiUsageService();

        service.trackTokens({
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15,
        });

        service.trackTokens({
            promptTokenCount: 7,
            candidatesTokenCount: 3,
            totalTokenCount: 10,
        });

        expect(service.getStats().tokenUsage).toEqual({
            promptTokenCount: 17,
            candidatesTokenCount: 8,
            totalTokenCount: 25,
        });
    });

    it("should ignore empty token metadata", () => {
        var service = new AiUsageService();

        service.trackTokens();

        expect(service.getStats().tokenUsage).toEqual({
            promptTokenCount: 0,
            candidatesTokenCount: 0,
            totalTokenCount: 0,
        });
    });
});