import { Module } from "@nestjs/common";
import { LoggerModule } from "../common/logger/logger.module";
import { QdrantVectorStoreService } from "./qdrant-vector-store.service";
import { RagConfigService } from "./rag-config.service";

@Module({
    imports: [LoggerModule],
    providers: [
        RagConfigService,
        QdrantVectorStoreService,
    ],
    exports: [
        RagConfigService,
        QdrantVectorStoreService,
    ],
})
export class RagModule { }