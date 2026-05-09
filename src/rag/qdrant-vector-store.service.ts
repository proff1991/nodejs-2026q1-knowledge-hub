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
    , QdrantSearchResponse
    , QdrantSearchResultItem
} from "./types/qdrant.types";

@Injectable()
export class QdrantVectorStoreService {
    private readonly requestTimeoutMs = 10000;

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

        await this.request("PUT", `/collections/${encodeURIComponent(collectionName)}`, {
            vectors: {
                size: vectorSize,
                distance: "Cosine",
            },
        });
    }

    async upsertPoints(points: QdrantPoint[]): Promise<void> {
        if (points.length === 0) {
            return;
        }

        var collectionName = this.config.getVectorCollection();

        await this.request(
            "PUT",
            `/collections/${encodeURIComponent(collectionName)}/points?wait=true`,
            {
                points,
            },
        );
    }

    async search(
        vector: number[],
        limit: number,
        filter?: QdrantFilter,
    ): Promise<QdrantSearchResultItem[]> {
        var collectionName = this.config.getVectorCollection();
        var responseData = await this.request(
            "POST",
            `/collections/${encodeURIComponent(collectionName)}/points/search`,
            {
                vector,
                limit,
                with_payload: true,
                ...(typeof filter !== "undefined" ? { filter } : {}),
            },
        ) as QdrantSearchResponse;

        return responseData.result ?? [];
    }

    async countByArticleId(articleId: string): Promise<number> {
        var collectionName = this.config.getVectorCollection();
        var responseData = await this.request(
            "POST",
            `/collections/${encodeURIComponent(collectionName)}/points/count`,
            {
                exact: true,
                filter: this.createArticleFilter(articleId),
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
            "POST",
            `/collections/${encodeURIComponent(collectionName)}/points/delete?wait=true`,
            {
                filter: this.createArticleFilter(articleId),
            },
        );

        return existingCount;
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

    private createArticleFilter(articleId: string): QdrantFilter {
        return {
            must: [
                {
                    key: "articleId",
                    match: {
                        value: articleId,
                    },
                },
            ],
        };
    }

    private async request(
        method: string,
        path: string,
        body?: unknown,
    ): Promise<unknown> {
        var controller = new AbortController();
        var timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

        try {
            var response = await fetch(`${this.config.getVectorDbUrl()}${path}`, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                ...(typeof body !== "undefined"
                    ? { body: JSON.stringify(body) }
                    : {}),
                signal: controller.signal,
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
                    "Vector database request failed",
                    undefined,
                    "QdrantVectorStoreService",
                    {
                        path,
                        error: error.message,
                    },
                );

                throw error;
            }

            var message = error instanceof Error ? error.message : "Unknown vector DB error";

            this.logger.error(
                "Vector database is unavailable",
                undefined,
                "QdrantVectorStoreService",
                {
                    path,
                    error: message,
                },
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