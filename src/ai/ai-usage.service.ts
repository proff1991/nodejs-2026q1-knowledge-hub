import { Injectable } from "@nestjs/common";

type AiEndpointName = "generate" | "summarize" | "translate" | "analyze";

type TokenUsage = {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
};

@Injectable()
export class AiUsageService {
    private readonly startedAt = new Date().toISOString();

    private totalRequests = 0;

    private readonly requestsByEndpoint: Record<AiEndpointName, number> = {
        generate: 0,
        summarize: 0,
        translate: 0,
        analyze: 0,
    };

    private readonly tokenUsage: TokenUsage = {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
        totalTokenCount: 0,
    };

    trackRequest(endpoint: AiEndpointName): void {
        this.totalRequests++;
        this.requestsByEndpoint[endpoint]++;
    }

    trackTokens(usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
    }): void {
        if (!usageMetadata) {
            return;
        }

        this.tokenUsage.promptTokenCount += usageMetadata.promptTokenCount ?? 0;
        this.tokenUsage.candidatesTokenCount += usageMetadata.candidatesTokenCount ?? 0;
        this.tokenUsage.totalTokenCount += usageMetadata.totalTokenCount ?? 0;
    }

    getStats() {
        return {
            startedAt: this.startedAt,
            totalRequests: this.totalRequests,
            requestsByEndpoint: this.requestsByEndpoint,
            tokenUsage: this.tokenUsage,
        };
    }
}