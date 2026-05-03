import { Module } from "@nestjs/common";
import { ArticleModule } from "../article/article.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { GeminiService } from "./gemini.service";

@Module({
    imports: [ArticleModule],
    controllers: [AiController],
    providers: [AiService, GeminiService],
    exports: [AiService, GeminiService],
})
export class AiModule { }