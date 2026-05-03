import { Injectable } from "@nestjs/common";

type AiEndpointName = "generate" | "summarize" | "translate" | "analyze";

type EndpointMetric = {
    totalCalls: number;
    successCalls: number;
    failedCalls: number;
    totalLatencyMs: number;
    minLatencyMs: number | null;
    maxLatencyMs: number | null;
};

@Injectable()
export class AiObservabilityService {
    private readonly metricsByEndpoint: Record<AiEndpointName, EndpointMetric> = {
        generate: this.createEmptyMetric(),
        summarize: this.createEmptyMetric(),
        translate: this.createEmptyMetric(),
        analyze: this.createEmptyMetric(),
    };

    trackLatency(endpoint: AiEndpointName, latencyMs: number, success: boolean): void {
        var metric = this.metricsByEndpoint[endpoint];

        metric.totalCalls++;
        metric.totalLatencyMs += latencyMs;

        if (success) {
            metric.successCalls++;
        } else {
            metric.failedCalls++;
        }

        if (metric.minLatencyMs === null || latencyMs < metric.minLatencyMs) {
            metric.minLatencyMs = latencyMs;
        }

        if (metric.maxLatencyMs === null || latencyMs > metric.maxLatencyMs) {
            metric.maxLatencyMs = latencyMs;
        }
    }

    getStats() {
        return {
            metricsByEndpoint: {
                generate: this.formatMetric(this.metricsByEndpoint.generate),
                summarize: this.formatMetric(this.metricsByEndpoint.summarize),
                translate: this.formatMetric(this.metricsByEndpoint.translate),
                analyze: this.formatMetric(this.metricsByEndpoint.analyze),
            },
        };
    }

    private createEmptyMetric(): EndpointMetric {
        return {
            totalCalls: 0,
            successCalls: 0,
            failedCalls: 0,
            totalLatencyMs: 0,
            minLatencyMs: null,
            maxLatencyMs: null,
        };
    }

    private formatMetric(metric: EndpointMetric) {
        return {
            totalCalls: metric.totalCalls,
            successCalls: metric.successCalls,
            failedCalls: metric.failedCalls,
            averageLatencyMs: metric.totalCalls === 0
                ? 0
                : Math.round(metric.totalLatencyMs / metric.totalCalls),
            minLatencyMs: metric.minLatencyMs,
            maxLatencyMs: metric.maxLatencyMs,
        };
    }
}