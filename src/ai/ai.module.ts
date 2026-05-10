import { Module } from "@nestjs/common";
import { ArticleModule } from "../article/article.module";
import { LoggerModule } from "../common/logger/logger.module";
import { AiCacheService } from "./ai-cache.service";
import { AiController } from "./ai.controller";
import { AiConversationContextService } from "./ai-conversation-context.service";
import { AiObservabilityService } from "./ai-observability.service";
import { AiRateLimitGuard } from "./ai-rate-limit.guard";
import { AiService } from "./ai.service";
import { AiUsageService } from "./ai-usage.service";
import { GeminiService } from "./gemini.service";

@Module({
    imports: [
        ArticleModule
        , LoggerModule
    ]
    , controllers: [AiController]
    , providers: [
        AiService
        , GeminiService
        , AiCacheService
        , AiUsageService
        , AiObservabilityService
        , AiConversationContextService
        , AiRateLimitGuard
    ]
    , exports: [
        AiService
        , GeminiService
        , AiRateLimitGuard
    ]
})
export class AiModule { }