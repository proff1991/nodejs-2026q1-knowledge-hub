import {
    Injectable
    , InternalServerErrorException
} from "@nestjs/common";

@Injectable()
export class RagConfigService {
    private readonly defaultVectorDbProvider = "qdrant";
    private readonly defaultVectorDbUrl = "http://vectordb:6333";
    private readonly defaultVectorCollection = "knowledge_hub_articles";
    private readonly defaultChunkSize = 800;
    private readonly defaultChunkOverlap = 200;
    private readonly defaultConversationMaxMessages = 20;

    getVectorDbProvider(): string {
        return process.env.RAG_VECTOR_DB_PROVIDER || this.defaultVectorDbProvider;
    }

    getVectorDbUrl(): string {
        return (process.env.RAG_VECTOR_DB_URL || this.defaultVectorDbUrl).replace(/\/+$/, "");
    }

    getVectorCollection(): string {
        return process.env.RAG_VECTOR_COLLECTION || this.defaultVectorCollection;
    }

    getChunkSize(): number {
        return this.getPositiveIntegerEnv("RAG_CHUNK_SIZE", this.defaultChunkSize);
    }

    getChunkOverlap(): number {
        var chunkSize = this.getChunkSize();
        var chunkOverlap = this.getPositiveIntegerEnv(
            "RAG_CHUNK_OVERLAP",
            this.defaultChunkOverlap,
        );

        if (chunkOverlap >= chunkSize) {
            throw new InternalServerErrorException(
                "RAG_CHUNK_OVERLAP must be lower than RAG_CHUNK_SIZE",
            );
        }

        return chunkOverlap;
    }

    getConversationMaxMessages(): number {
        return this.getPositiveIntegerEnv(
            "RAG_CONVERSATION_MAX_MESSAGES",
            this.defaultConversationMaxMessages,
        );
    }

    private getPositiveIntegerEnv(name: string, fallback: number): number {
        var rawValue = process.env[name];

        if (typeof rawValue === "undefined" || rawValue === "") {
            return fallback;
        }

        var parsedValue = Number(rawValue);

        if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
            throw new InternalServerErrorException(`${name} must be a positive integer`);
        }

        return parsedValue;
    }
}