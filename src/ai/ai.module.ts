import { Module } from "@nestjs/common";
import { ArticleModule } from "../article/article.module";
import { AiCacheService } from "./ai-cache.service";
import { AiController } from "./ai.controller";
import { AiRateLimitGuard } from "./ai-rate-limit.guard";
import { AiService } from "./ai.service";
import { AiUsageService } from "./ai-usage.service";
import { GeminiService } from "./gemini.service";

@Module({
    imports: [ArticleModule],
    controllers: [AiController],
    providers: [AiService, GeminiService, AiCacheService, AiUsageService, AiRateLimitGuard],
    exports: [AiService, GeminiService],
})
export class AiModule { }