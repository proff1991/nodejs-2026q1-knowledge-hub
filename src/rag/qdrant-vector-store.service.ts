import {
    Injectable
    , ServiceUnavailableException
} from "@nestjs/common";
import { AppLoggerService } from "../common/logger/app-logger.service";
import { RagConfigService } from "./rag-config.service";
import {
    QdrantCountResponse
    , QdrantFilter
    , QdrantPoint
    , QdrantPointPayload
    , QdrantScrollOffset
    , QdrantScrollResponse
    , QdrantSearchResponse
    , QdrantSearchResultItem
    , QdrantStoredPoint
} from "./types/qdrant.types";

export type QdrantIndexedArticleSummary = {
    articleId: string;
    updatedAt: number;
    chunkSize: number | null;
    chunkOverlap: number | null;
    chunksCount: number;
};

@Injectable()
export class QdrantVectorStoreService {
    private readonly requestTimeoutMs = 10000;
    private readonly scrollBatchSize = 100;

    constructor(
        private readonly config: RagConfigService,
        private readonly logger: AppLoggerService,
    ) { }

    async checkHealth(): Promise<void> {
        await this.request("GET", "/healthz");
    }

    async ensureCollection(vectorSize: number): Promise<void> {
        var collectionName = this.config.getVectorCollection();
        var exists = await this.collectionExists(collectionName);

        if (exists) {
            return;
        }

        await this.createCollection(vectorSize);
    }

    async recreateCollection(vectorSize: number): Promise<void> {
        await this.deleteCollectionIfExists();
        await this.createCollection(vectorSize);
    }

    async deleteCollectionIfExists(): Promise<void> {
        var collectionName = this.config.getVectorCollection();

        try {
            await this.request("DELETE", `/collections/${encodeURIComponent(collectionName)}`);
        } catch (error) {
            if (this.isNotFoundError(error)) {
                return;
            }

            throw error;
        }
    }

    async upsertPoints(points: QdrantPoint[]): Promise<void> {
        if (points.length === 0) {
            return;
        }

        var collectionName = this.config.getVectorCollection();

        await this.request(
            "PUT"
            , `/collections/${encodeURIComponent(collectionName)}/points?wait=true`
            , {
                points,
            }
        );
    }

    async search(
        vector: number[]
        , limit: number
        , filter?: QdrantFilter
    ): Promise<QdrantSearchResultItem[]> {
        var collectionName = this.config.getVectorCollection();
        var responseData = await this.request(
            "POST"
            , `/collections/${encodeURIComponent(collectionName)}/points/search`
            , {
                vector,
                limit,
                with_payload: true,
                ...(typeof filter !== "undefined" ? { filter } : {}),
            }
        ) as QdrantSearchResponse;

        return responseData.result ?? [];
    }

    async getIndexedArticleSummaries(filter?: QdrantFilter): Promise<QdrantIndexedArticleSummary[]> {
        var exists = await this.collectionExists(this.config.getVectorCollection());

        if (!exists) {
            return [];
        }

        var points = await this.scrollPayloads(filter);
        var summaryMap = new Map<string, QdrantIndexedArticleSummary>();

        for (var point of points) {
            var payload = point.payload ?? {};
            var articleId = this.getStringPayloadValue(payload, "articleId");

            if (!articleId) {
                continue;
            }

            var updatedAt = this.getNumberPayloadValue(payload, "updatedAt");
            var chunkSize = this.getNullableNumberPayloadValue(payload, "chunkSize");
            var chunkOverlap = this.getNullableNumberPayloadValue(payload, "chunkOverlap");
            var existing = summaryMap.get(articleId);

            if (typeof existing === "undefined") {
                summaryMap.set(articleId, {
                    articleId
                    , updatedAt
                    , chunkSize
                    , chunkOverlap
                    , chunksCount: 1
                });

                continue;
            }

            existing.updatedAt = Math.max(existing.updatedAt, updatedAt);
            existing.chunksCount += 1;

            if (existing.chunkSize !== chunkSize) {
                existing.chunkSize = null;
            }

            if (existing.chunkOverlap !== chunkOverlap) {
                existing.chunkOverlap = null;
            }
        }

        return [...summaryMap.values()];
    }

    async scrollPayloads(filter?: QdrantFilter): Promise<QdrantStoredPoint[]> {
        var exists = await this.collectionExists(this.config.getVectorCollection());

        if (!exists) {
            return [];
        }

        var collectionName = this.config.getVectorCollection();
        var offset: QdrantScrollOffset | undefined = undefined;
        var points: QdrantStoredPoint[] = [];

        do {
            var responseData = await this.request(
                "POST"
                , `/collections/${encodeURIComponent(collectionName)}/points/scroll`
                , {
                    limit: this.scrollBatchSize
                    , with_payload: true
                    , with_vector: false
                    , ...(typeof filter !== "undefined" ? { filter } : {})
                    , ...(typeof offset !== "undefined" ? { offset } : {})
                }
            ) as QdrantScrollResponse;

            points.push(...(responseData.result?.points ?? []));
            offset = responseData.result?.next_page_offset ?? undefined;
        } while (typeof offset !== "undefined" && offset !== null);

        return points;
    }

    async countByArticleId(articleId: string): Promise<number> {
        var exists = await this.collectionExists(this.config.getVectorCollection());

        if (!exists) {
            return 0;
        }

        var collectionName = this.config.getVectorCollection();
        var responseData = await this.request(
            "POST"
            , `/collections/${encodeURIComponent(collectionName)}/points/count`
            , {
                exact: true
                , filter: this.createArticleFilter(articleId)
            },
        ) as QdrantCountResponse;

        return responseData.result?.count ?? 0;
    }

    async deleteByArticleId(articleId: string): Promise<number> {
        var existingCount = await this.countByArticleId(articleId);

        if (existingCount === 0) {
            return 0;
        }

        var collectionName = this.config.getVectorCollection();

        await this.request(
            "POST"
            , `/collections/${encodeURIComponent(collectionName)}/points/delete?wait=true`
            , {
                filter: this.createArticleFilter(articleId)
            }
        );

        return existingCount;
    }

    private async createCollection(vectorSize: number): Promise<void> {
        var collectionName = this.config.getVectorCollection();

        await this.request("PUT", `/collections/${encodeURIComponent(collectionName)}`, {
            vectors: {
                size: vectorSize
                , distance: "Cosine"
            }
        });
    }

    private async collectionExists(collectionName: string): Promise<boolean> {
        try {
            await this.request("GET", `/collections/${encodeURIComponent(collectionName)}`);

            return true;
        } catch (error) {
            if (this.isNotFoundError(error)) {
                return false;
            }

            throw error;
        }
    }

    private getStringPayloadValue(payload: QdrantPointPayload, key: string): string {
        var value = payload[key];

        if (typeof value === "string") {
            return value;
        }

        return "";
    }

    private getNumberPayloadValue(payload: QdrantPointPayload, key: string): number {
        var value = payload[key];

        if (typeof value === "number") {
            return value;
        }

        return 0;
    }

    private getNullableNumberPayloadValue(payload: QdrantPointPayload, key: string): number | null {
        var value = payload[key];

        if (typeof value === "number") {
            return value;
        }

        return null;
    }

    private createArticleFilter(articleId: string): QdrantFilter {
        return {
            must: [
                {
                    key: "articleId"
                    , match: {
                        value: articleId
                    }
                }
            ]
        };
    }

    private async request(
        method: string
        , path: string
        , body?: unknown
    ): Promise<unknown> {
        var controller = new AbortController();
        var timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

        try {
            var response = await fetch(`${this.config.getVectorDbUrl()}${path}`, {
                method
                , headers: {
                    "Content-Type": "application/json"
                },
                ...(typeof body !== "undefined"
                    ? { body: JSON.stringify(body) }
                    : {}),
                signal: controller.signal
            });

            var responseData = await this.readResponse(response);

            if (!response.ok) {
                throw new ServiceUnavailableException({
                    message: "Vector database request failed",
                    statusCode: response.status,
                    path,
                });
            }

            return responseData;
        } catch (error) {
            if (error instanceof ServiceUnavailableException) {
                this.logger.error(
                    "Vector database request failed"
                    , undefined
                    , "QdrantVectorStoreService"
                    , {
                        path,
                        error: error.message,
                    }
                );

                throw error;
            }

            var message = error instanceof Error ? error.message : "Unknown vector DB error";

            this.logger.error(
                "Vector database is unavailable"
                , undefined,
                "QdrantVectorStoreService"
                , {
                    path
                    , error: message
                }
            );

            throw new ServiceUnavailableException("Vector database is unavailable");
        } finally {
            clearTimeout(timeout);
        }
    }

    private async readResponse(response: Response): Promise<unknown> {
        var rawText = await response.text();

        if (!rawText) {
            return {};
        }

        try {
            return JSON.parse(rawText) as unknown;
        } catch (error) {
            return {
                rawText,
            };
        }
    }

    private isNotFoundError(error: unknown): boolean {
        if (!(error instanceof ServiceUnavailableException)) {
            return false;
        }

        var response = error.getResponse();

        if (typeof response !== "object" || response === null) {
            return false;
        }

        return (response as { statusCode?: number }).statusCode === 404;
    }
}