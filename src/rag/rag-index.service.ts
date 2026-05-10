import {
    Injectable
    , NotFoundException
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { GeminiService } from "../ai/gemini.service";
import { AppLoggerService } from "../common/logger/app-logger.service";
import { PrismaService } from "../prisma/prisma.service";
import {
    QdrantIndexedArticleSummary
    , QdrantVectorStoreService
} from "./qdrant-vector-store.service";
import { RagChunkingService } from "./rag-chunking.service";
import { RagConfigService } from "./rag-config.service";
import { ReindexRequestDto } from "./dto/reindex-request.dto";
import { RagArticleChunk } from "./types/rag-chunk.types";
import {
    RagIndexArticle
    , RagIndexResponse
} from "./types/rag-index.types";
import {
    QdrantFilter
    , QdrantPoint
} from "./types/qdrant.types";

@Injectable()
export class RagIndexService {
    private readonly embeddingBatchSize = 50;

    constructor(
        private readonly prisma: PrismaService
        , private readonly geminiService: GeminiService
        , private readonly chunkingService: RagChunkingService
        , private readonly vectorStore: QdrantVectorStoreService
        , private readonly config: RagConfigService
        , private readonly logger: AppLoggerService
    ) { }

    async reindex(request: ReindexRequestDto): Promise<RagIndexResponse> {
        if (request.incremental === true) {
            return this.reindexIncrementally(request);
        }

        return this.reindexFullyOrSelectively(request);
    }

    async deleteArticleFromIndex(articleId: string): Promise<void> {
        await this.vectorStore.checkHealth();

        var deletedCount = await this.vectorStore.deleteByArticleId(articleId);

        if (deletedCount === 0) {
            throw new NotFoundException("Article vectors were not found in RAG index");
        }

        this.logger.log("Article vectors were deleted from RAG index", "RagIndexService", {
            articleId
            , deletedCount
            , vectorCollection: this.config.getVectorCollection()
        });
    }

    private async reindexFullyOrSelectively(request: ReindexRequestDto): Promise<RagIndexResponse> {
        var articles = await this.findArticlesForIndexing(request);
        var chunks = this.createChunks(articles);
        var isSelectiveReindex = typeof request.articleIds !== "undefined";

        await this.vectorStore.checkHealth();

        if (isSelectiveReindex) {
            await this.deleteExistingArticlePointsByIds(request.articleIds ?? []);
        }

        if (chunks.length === 0) {
            if (!isSelectiveReindex) {
                await this.vectorStore.deleteCollectionIfExists();
            }

            return {
                indexedArticles: articles.length
                , indexedChunks: 0
                , vectorCollection: this.config.getVectorCollection()
                , indexingMode: isSelectiveReindex ? "selective" : "full"
            };
        }

        var embeddings = await this.createEmbeddings(chunks);
        var vectorSize = embeddings[0].values.length;

        if (isSelectiveReindex) {
            await this.vectorStore.ensureCollection(vectorSize);
        } else {
            await this.vectorStore.recreateCollection(vectorSize);
        }

        await this.vectorStore.upsertPoints(this.createPoints(chunks, embeddings));

        this.logger.log("RAG index refreshed", "RagIndexService", {
            indexedArticles: articles.length
            , indexedChunks: chunks.length
            , vectorCollection: this.config.getVectorCollection()
            , reindexMode: isSelectiveReindex ? "selective" : "full"
        });

        return {
            indexedArticles: articles.length
            , indexedChunks: chunks.length
            , vectorCollection: this.config.getVectorCollection()
            , indexingMode: isSelectiveReindex ? "selective" : "full"
        };
    }

    private async reindexIncrementally(request: ReindexRequestDto): Promise<RagIndexResponse> {
        var articles = await this.findArticlesForIndexing(request);
        var indexedSummaries = await this.vectorStore.getIndexedArticleSummaries(
            this.createIndexedSummaryFilter(request.articleIds)
        );
        var articlesToIndex = this.findChangedArticles(articles, indexedSummaries);
        var staleArticleIds = this.findStaleArticleIds(articles, indexedSummaries, request.articleIds);

        await this.vectorStore.checkHealth();
        await this.deleteExistingArticlePointsByIds([
            ...staleArticleIds
            , ...articlesToIndex.map((article) => article.id)
        ]);

        var chunks = this.createChunks(articlesToIndex);

        if (chunks.length === 0) {
            return {
                indexedArticles: 0
                , indexedChunks: 0
                , vectorCollection: this.config.getVectorCollection()
                , skippedArticles: articles.length - articlesToIndex.length
                , removedArticles: staleArticleIds.length
                , indexingMode: "incremental"
            };
        }

        var embeddings = await this.createEmbeddings(chunks);
        var vectorSize = embeddings[0].values.length;

        await this.vectorStore.ensureCollection(vectorSize);
        await this.vectorStore.upsertPoints(this.createPoints(chunks, embeddings));

        this.logger.log("RAG index refreshed incrementally", "RagIndexService", {
            indexedArticles: articlesToIndex.length
            , indexedChunks: chunks.length
            , skippedArticles: articles.length - articlesToIndex.length
            , removedArticles: staleArticleIds.length
            , vectorCollection: this.config.getVectorCollection()
        });

        return {
            indexedArticles: articlesToIndex.length
            , indexedChunks: chunks.length
            , vectorCollection: this.config.getVectorCollection()
            , skippedArticles: articles.length - articlesToIndex.length
            , removedArticles: staleArticleIds.length
            , indexingMode: "incremental"
        };
    }

    private async findArticlesForIndexing(
        request: ReindexRequestDto
    ): Promise<RagIndexArticle[]> {
        var onlyPublished = request.onlyPublished ?? true;

        return await this.prisma.article.findMany({
            where: {
                ...(onlyPublished ? { status: "PUBLISHED" } : {})
                , ...(typeof request.articleIds !== "undefined"
                    ? {
                        id: {
                            in: request.articleIds
                        }
                    }
                    : {})
            }
            , include: {
                tags: {
                    select: {
                        name: true
                    }
                }
            }
            , orderBy: {
                updatedAt: "asc"
            }
        });
    }

    private createChunks(articles: RagIndexArticle[]): RagArticleChunk[] {
        return articles.flatMap((article) =>
            this.chunkingService.createArticleChunks({
                articleId: article.id
                , articleTitle: article.title
                , articleContent: article.content
                , articleStatus: article.status.toLowerCase()
                , categoryId: article.categoryId
                , tags: article.tags.map((tag) => tag.name)
                , updatedAt: article.updatedAt.getTime()
            })
        );
    }

    private findChangedArticles(
        articles: RagIndexArticle[]
        , indexedSummaries: QdrantIndexedArticleSummary[]
    ): RagIndexArticle[] {
        var indexedSummaryMap = new Map(
            indexedSummaries.map((summary) => [summary.articleId, summary])
        );
        var chunkSize = this.config.getChunkSize();
        var chunkOverlap = this.config.getChunkOverlap();

        return articles.filter((article) => {
            var indexedSummary = indexedSummaryMap.get(article.id);

            if (typeof indexedSummary === "undefined") {
                return true;
            }

            if (indexedSummary.updatedAt !== article.updatedAt.getTime()) {
                return true;
            }

            if (indexedSummary.chunkSize !== chunkSize) {
                return true;
            }

            if (indexedSummary.chunkOverlap !== chunkOverlap) {
                return true;
            }

            return false;
        });
    }

    private findStaleArticleIds(
        articles: RagIndexArticle[]
        , indexedSummaries: QdrantIndexedArticleSummary[]
        , requestedArticleIds?: string[]
    ): string[] {
        var currentArticleIds = new Set(articles.map((article) => article.id));
        var allowedArticleIds = typeof requestedArticleIds !== "undefined"
            ? new Set(requestedArticleIds)
            : null;

        return indexedSummaries
            .map((summary) => summary.articleId)
            .filter((articleId) => {
                if (allowedArticleIds !== null && !allowedArticleIds.has(articleId)) {
                    return false;
                }

                return !currentArticleIds.has(articleId);
            });
    }

    private createIndexedSummaryFilter(articleIds?: string[]): QdrantFilter | undefined {
        if (typeof articleIds === "undefined" || articleIds.length === 0) {
            return undefined;
        }

        return {
            must: [
                {
                    key: "articleId"
                    , match: {
                        any: articleIds
                    }
                }
            ]
        };
    }

    private async deleteExistingArticlePointsByIds(articleIds: string[]): Promise<void> {
        for (var articleId of articleIds) {
            await this.vectorStore.deleteByArticleId(articleId);
        }
    }

    private async createEmbeddings(chunks: RagArticleChunk[]) {
        var embeddings = [];

        for (var index = 0; index < chunks.length; index += this.embeddingBatchSize) {
            var chunkBatch = chunks.slice(index, index + this.embeddingBatchSize);
            var batchEmbeddings = await this.geminiService.embedTexts(
                chunkBatch.map((chunk) => chunk.chunk)
                , {
                    taskType: "RETRIEVAL_DOCUMENT"
                }
            );

            embeddings.push(...batchEmbeddings);
        }

        return embeddings;
    }

    private createPoints(chunks: RagArticleChunk[], embeddings: Awaited<ReturnType<GeminiService["embedTexts"]>>): QdrantPoint[] {
        return chunks.map((chunk, index) => ({
            id: this.createPointId(chunk.articleId, chunk.chunkIndex)
            , vector: embeddings[index].values
            , payload: {
                articleId: chunk.articleId
                , articleTitle: chunk.articleTitle
                , articleStatus: chunk.articleStatus
                , categoryId: chunk.categoryId
                , tags: chunk.tags
                , chunkIndex: chunk.chunkIndex
                , chunk: chunk.chunk
                , updatedAt: chunk.updatedAt
                , chunkSize: this.config.getChunkSize()
                , chunkOverlap: this.config.getChunkOverlap()
            }
        }));
    }

    private createPointId(articleId: string, chunkIndex: number): string {
        var hash = createHash("sha256")
            .update(`${articleId}:${chunkIndex}`)
            .digest("hex")
            .slice(0, 32)
            .split("");

        hash[12] = "5";
        hash[16] = (8 + (parseInt(hash[16], 16) % 4)).toString(16);

        var uuid = hash.join("");

        return [
            uuid.slice(0, 8)
            , uuid.slice(8, 12)
            , uuid.slice(12, 16)
            , uuid.slice(16, 20)
            , uuid.slice(20, 32)
        ].join("-");
    }
}
