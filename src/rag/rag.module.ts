import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { LoggerModule } from "../common/logger/logger.module";
import { PrismaModule } from "../prisma/prisma.module";
import { QdrantVectorStoreService } from "./qdrant-vector-store.service";
import { RagChatService } from "./rag-chat.service";
import { RagChunkingService } from "./rag-chunking.service";
import { RagConfigService } from "./rag-config.service";
import { RagController } from "./rag.controller";
import { RagConversationMemoryService } from "./rag-conversation-memory.service";
import { RagIndexService } from "./rag-index.service";
import { RagRerankingService } from "./rag-reranking.service";
import { RagSearchService } from "./rag-search.service";

@Module({
    imports: [
        AiModule
        , LoggerModule
        , PrismaModule
    ]
    , controllers: [RagController]
    , providers: [
        RagConfigService
        , RagChunkingService
        , RagConversationMemoryService
        , RagIndexService
        , RagRerankingService
        , RagSearchService
        , RagChatService
        , QdrantVectorStoreService
    ]
    , exports: [
        RagConfigService
        , RagChunkingService
        , RagConversationMemoryService
        , RagIndexService
        , RagRerankingService
        , RagSearchService
        , RagChatService
        , QdrantVectorStoreService
    ]
})
export class RagModule { }