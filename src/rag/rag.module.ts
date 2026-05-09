import { Module } from "@nestjs/common";
import { LoggerModule } from "../common/logger/logger.module";
import { QdrantVectorStoreService } from "./qdrant-vector-store.service";
import { RagConfigService } from "./rag-config.service";
import { RagChunkingService } from "./rag-chunking.service";

@Module({
    imports: [LoggerModule],
    providers: [
        RagConfigService
        , RagChunkingService
        , QdrantVectorStoreService
    ],
    exports: [
        RagConfigService
        , RagChunkingService
        , QdrantVectorStoreService
    ],
})
export class RagModule { }