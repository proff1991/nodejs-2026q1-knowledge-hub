import { Injectable } from "@nestjs/common";
import { GeminiService } from "../ai/gemini.service";
import { QdrantVectorStoreService } from "./qdrant-vector-store.service";
import { RagSearchRequestDto } from "./dto/rag-search-request.dto";
import { QdrantCondition, QdrantFilter } from "./types/qdrant.types";
import {
    RagSearchPayload
    , RagSearchResponse
    , RagSearchResult
} from "./types/rag-search.types";

@Injectable()
export class RagSearchService {
    private readonly defaultLimit = 5;
    private readonly maxLimit = 20;

    constructor(
        private readonly geminiService: GeminiService,
        private readonly vectorStore: QdrantVectorStoreService,
    ) { }

    async search(request: RagSearchRequestDto): Promise<RagSearchResponse> {
        var limit = this.normalizeLimit(request.limit);
        var queryEmbedding = await this.geminiService.embedText(request.query, {
            taskType: "RETRIEVAL_QUERY",
        });

        var searchResults = await this.vectorStore.search(
            queryEmbedding.values,
            limit,
            this.createFilter(request),
        );

        return {
            results: searchResults.map((result): RagSearchResult => {
                var payload = result.payload as RagSearchPayload | undefined;

                return {
                    articleId: this.getStringPayloadValue(payload, "articleId"),
                    articleTitle: this.getStringPayloadValue(payload, "articleTitle"),
                    chunk: this.getStringPayloadValue(payload, "chunk"),
                    similarity: result.score,
                };
            }),
        };
    }

    private normalizeLimit(limit?: number): number {
        if (typeof limit === "undefined") {
            return this.defaultLimit;
        }

        return Math.min(Math.max(limit, 1), this.maxLimit);
    }

    private createFilter(request: RagSearchRequestDto): QdrantFilter | undefined {
        var must: QdrantCondition[] = [];

        if (typeof request.articleStatus !== "undefined") {
            must.push({
                key: "articleStatus",
                match: {
                    value: request.articleStatus,
                },
            });
        }

        if (typeof request.categoryId !== "undefined") {
            must.push({
                key: "categoryId",
                match: {
                    value: request.categoryId,
                },
            });
        }

        if (typeof request.tags !== "undefined" && request.tags.length > 0) {
            must.push({
                key: "tags",
                match: {
                    any: request.tags,
                },
            });
        }

        if (must.length === 0) {
            return undefined;
        }

        return {
            must,
        };
    }

    private getStringPayloadValue(
        payload: RagSearchPayload | undefined,
        key: keyof RagSearchPayload,
    ): string {
        var value = payload?.[key];

        if (typeof value === "string") {
            return value;
        }

        return "";
    }
}