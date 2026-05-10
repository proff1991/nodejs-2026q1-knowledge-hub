import { Injectable } from "@nestjs/common";
import { GeminiService } from "../ai/gemini.service";
import { QdrantVectorStoreService } from "./qdrant-vector-store.service";
import { RagSearchRequestDto } from "./dto/rag-search-request.dto";
import { RagRerankingService } from "./rag-reranking.service";
import {
    QdrantCondition
    , QdrantFilter
    , QdrantSearchResultItem
    , QdrantStoredPoint
} from "./types/qdrant.types";
import {
    RagRetrievalMode
    , RagSearchCandidate
    , RagSearchPayload
    , RagSearchResponse
    , RagSearchResult
} from "./types/rag-search.types";

@Injectable()
export class RagSearchService {
    private readonly defaultLimit = 5;
    private readonly maxLimit = 20;
    private readonly candidateMultiplier = 4;
    private readonly minCandidateLimit = 20;

    constructor(
        private readonly geminiService: GeminiService
        , private readonly vectorStore: QdrantVectorStoreService
        , private readonly rerankingService: RagRerankingService
    ) { }

    async search(request: RagSearchRequestDto): Promise<RagSearchResponse> {
        var limit = this.normalizeLimit(request.limit);
        var candidateLimit = this.normalizeCandidateLimit(limit);
        var filter = this.createFilter(request);
        var queryEmbedding = await this.geminiService.embedText(request.query, {
            taskType: "RETRIEVAL_QUERY"
        });

        var semanticResults = await this.vectorStore.search(
            queryEmbedding.values
            , candidateLimit
            , filter
        );
        var semanticCandidates = this.createSemanticCandidates(semanticResults);
        var lexicalCandidates = await this.createLexicalCandidates(
            request.query
            , candidateLimit
            , filter
        );
        var mergedCandidates = this.mergeCandidates(semanticCandidates, lexicalCandidates);
        var rerankedCandidates = this.rerankingService.rerank(request.query, mergedCandidates);

        return {
            results: rerankedCandidates
                .slice(0, limit)
                .map((candidate): RagSearchResult => ({
                    articleId: candidate.articleId
                    , articleTitle: candidate.articleTitle
                    , chunk: candidate.chunk
                    , similarity: candidate.similarity
                    , semanticSimilarity: candidate.semanticSimilarity
                    , lexicalScore: candidate.lexicalScore
                    , rerankScore: candidate.rerankScore
                    , retrievalMode: candidate.retrievalMode
                }))
        };
    }

    private createSemanticCandidates(results: QdrantSearchResultItem[]): RagSearchCandidate[] {
        return results
            .map((result) => {
                var payload = result.payload as RagSearchPayload | undefined;

                return this.createCandidateFromPayload(
                    result.id
                    , payload
                    , result.score
                    , 0
                    , "semantic"
                );
            })
            .filter((candidate): candidate is RagSearchCandidate => candidate !== null);
    }

    private async createLexicalCandidates(
        query: string
        , limit: number
        , filter?: QdrantFilter
    ): Promise<RagSearchCandidate[]> {
        var points = await this.vectorStore.scrollPayloads(filter);

        return points
            .map((point) => this.createLexicalCandidate(query, point))
            .filter((candidate): candidate is RagSearchCandidate => candidate !== null)
            .filter((candidate) => (candidate.lexicalScore ?? 0) > 0)
            .sort((left, right) => (right.lexicalScore ?? 0) - (left.lexicalScore ?? 0))
            .slice(0, limit);
    }

    private createLexicalCandidate(query: string, point: QdrantStoredPoint): RagSearchCandidate | null {
        var payload = point.payload as RagSearchPayload | undefined;
        var articleTitle = this.getStringPayloadValue(payload, "articleTitle");
        var chunk = this.getStringPayloadValue(payload, "chunk");
        var lexicalScore = Math.max(
            this.calculateLexicalScore(query, articleTitle)
            , this.calculateLexicalScore(query, chunk)
        );

        return this.createCandidateFromPayload(
            point.id
            , payload
            , 0
            , lexicalScore
            , "lexical"
        );
    }

    private createCandidateFromPayload(
        pointId: string
        , payload: RagSearchPayload | undefined
        , semanticSimilarity: number
        , lexicalScore: number
        , retrievalMode: RagRetrievalMode
    ): RagSearchCandidate | null {
        var articleId = this.getStringPayloadValue(payload, "articleId");
        var articleTitle = this.getStringPayloadValue(payload, "articleTitle");
        var chunk = this.getStringPayloadValue(payload, "chunk");
        var chunkIndex = this.getNumberPayloadValue(payload, "chunkIndex");

        if (!articleId || !articleTitle || !chunk) {
            return null;
        }

        return {
            pointId
            , articleId
            , articleTitle
            , chunk
            , chunkIndex
            , similarity: semanticSimilarity
            , semanticSimilarity
            , lexicalScore
            , retrievalMode
        };
    }

    private mergeCandidates(
        semanticCandidates: RagSearchCandidate[]
        , lexicalCandidates: RagSearchCandidate[]
    ): RagSearchCandidate[] {
        var candidateMap = new Map<string, RagSearchCandidate>();

        for (var candidate of [...semanticCandidates, ...lexicalCandidates]) {
            var key = this.createCandidateKey(candidate);
            var existingCandidate = candidateMap.get(key);

            if (typeof existingCandidate === "undefined") {
                candidateMap.set(key, candidate);

                continue;
            }

            candidateMap.set(key, {
                ...existingCandidate
                , semanticSimilarity: Math.max(
                    existingCandidate.semanticSimilarity ?? 0
                    , candidate.semanticSimilarity ?? 0
                )
                , lexicalScore: Math.max(
                    existingCandidate.lexicalScore ?? 0
                    , candidate.lexicalScore ?? 0
                )
                , retrievalMode: "hybrid"
            });
        }

        return [...candidateMap.values()];
    }

    private createCandidateKey(candidate: RagSearchCandidate): string {
        return `${candidate.articleId}:${candidate.chunkIndex}:${candidate.pointId}`;
    }

    private normalizeLimit(limit?: number): number {
        if (typeof limit === "undefined") {
            return this.defaultLimit;
        }

        return Math.min(Math.max(limit, 1), this.maxLimit);
    }

    private normalizeCandidateLimit(limit: number): number {
        return Math.max(this.minCandidateLimit, limit * this.candidateMultiplier);
    }

    private createFilter(request: RagSearchRequestDto): QdrantFilter | undefined {
        var must: QdrantCondition[] = [];

        if (typeof request.articleStatus !== "undefined") {
            must.push({
                key: "articleStatus"
                , match: {
                    value: request.articleStatus
                }
            });
        }

        if (typeof request.categoryId !== "undefined") {
            must.push({
                key: "categoryId"
                , match: {
                    value: request.categoryId
                }
            });
        }

        if (typeof request.tags !== "undefined" && request.tags.length > 0) {
            must.push({
                key: "tags"
                , match: {
                    any: request.tags
                }
            });
        }

        if (must.length === 0) {
            return undefined;
        }

        return {
            must
        };
    }

    private calculateLexicalScore(query: string, text: string): number {
        var queryTerms = this.getTerms(query);
        var textTerms = this.getTerms(text);

        if (queryTerms.length === 0 || textTerms.length === 0) {
            return 0;
        }

        var textTermSet = new Set(textTerms);
        var matchedTerms = queryTerms.filter((term) => textTermSet.has(term));

        return matchedTerms.length / queryTerms.length;
    }

    private getTerms(value: string): string[] {
        return value
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .replace(/\s+/g, " ")
            .trim()
            .split(" ")
            .filter((term) => term.length >= 3);
    }

    private getStringPayloadValue(
        payload: RagSearchPayload | undefined
        , key: keyof RagSearchPayload
    ): string {
        var value = payload?.[key];

        if (typeof value === "string") {
            return value;
        }

        return "";
    }

    private getNumberPayloadValue(
        payload: RagSearchPayload | undefined
        , key: keyof RagSearchPayload
    ): number {
        var value = payload?.[key];

        if (typeof value === "number") {
            return value;
        }

        return 0;
    }
}
