import { Injectable } from "@nestjs/common";
import { ArticleService } from "../article/article.service";
import { AiCacheService } from "./ai-cache.service";
import { AiUsageService } from "./ai-usage.service";
import { AnalyzeArticleDto } from "./dto/analyze-article.dto";
import { GenerateDto } from "./dto/generate.dto";
import { SummarizeArticleDto } from "./dto/summarize-article.dto";
import { TranslateArticleDto } from "./dto/translate-article.dto";
import { GeminiService } from "./gemini.service";
import {
    buildAnalyzeArticlePrompt
    , buildGenericPrompt
    , buildSummarizeArticlePrompt
    , buildTranslateArticlePrompt
} from "./prompts/ai-prompts";
import {
    AnalyzeArticleResponse
    , GenerateAiResponse
    , SummarizeArticleResponse
    , TranslateArticleResponse
} from "./types/ai.types";
import { AiObservabilityService } from "./ai-observability.service";
import { validateAnalyzeResponse } from "./validators/analyze-response.validator";
import { AiConversationContextService } from "./ai-conversation-context.service";

@Injectable()
export class AiService {
    constructor(
        private readonly geminiService: GeminiService,
        private readonly articleService: ArticleService,
        private readonly aiCacheService: AiCacheService,
        private readonly aiUsageService: AiUsageService,
        private readonly aiObservabilityService: AiObservabilityService,
        private readonly aiConversationContextService: AiConversationContextService,
    ) { }

    async generate(generateDto: GenerateDto): Promise<GenerateAiResponse> {
        return this.trackOperation("generate", async () => {
            this.aiUsageService.trackRequest("generate");

            var sessionId = this.aiConversationContextService.resolveSessionId(generateDto.sessionId);
            var contextMessages = this.aiConversationContextService.getMessages(sessionId);

            var result = await this.geminiService.generateText(
                buildGenericPrompt(generateDto.prompt, contextMessages),
                {
                    maxOutputTokens: generateDto.maxOutputTokens,
                    temperature: generateDto.temperature,
                },
            );

            this.aiUsageService.trackTokens(result.usageMetadata);

            this.aiConversationContextService.addTurn(
                sessionId,
                generateDto.prompt,
                result.text,
            );

            return {
                text: result.text,
                model: result.model,
                sessionId,
            };
        });
    }

    async summarizeArticle(
        articleId: string,
        summarizeArticleDto: SummarizeArticleDto,
    ): Promise<SummarizeArticleResponse> {
        return this.trackOperation("summarize", async () => {
            this.aiUsageService.trackRequest("summarize");

            var article = await this.articleService.findOne(articleId);
            var maxLength = summarizeArticleDto.maxLength ?? "medium";
            var cacheKey = this.aiCacheService.createKey([
                "summarize",
                article.id,
                article.updatedAt,
                maxLength,
            ]);

            var cachedResponse = this.aiCacheService.get<SummarizeArticleResponse>(cacheKey);

            if (cachedResponse) {
                return cachedResponse;
            }

            var result = await this.geminiService.generateText(
                buildSummarizeArticlePrompt(article.title, article.content, maxLength),
                {
                    maxOutputTokens: this.getSummaryTokenLimit(maxLength),
                    temperature: 0.3,
                },
            );

            this.aiUsageService.trackTokens(result.usageMetadata);

            var response: SummarizeArticleResponse = {
                articleId: article.id,
                summary: result.text,
                originalLength: article.content.length,
                summaryLength: result.text.length,
            };

            this.aiCacheService.set(cacheKey, response);

            return response;
        });
    }

    async translateArticle(
        articleId: string,
        translateArticleDto: TranslateArticleDto,
    ): Promise<TranslateArticleResponse> {
        return this.trackOperation("translate", async () => {
            this.aiUsageService.trackRequest("translate");

            var article = await this.articleService.findOne(articleId);
            var cacheKey = this.aiCacheService.createKey([
                "translate",
                article.id,
                article.updatedAt,
                translateArticleDto.targetLanguage,
                translateArticleDto.sourceLanguage ?? "auto",
            ]);

            var cachedResponse = this.aiCacheService.get<TranslateArticleResponse>(cacheKey);

            if (cachedResponse) {
                return cachedResponse;
            }

            var result = await this.geminiService.generateText(
                buildTranslateArticlePrompt(
                    article.title,
                    article.content,
                    translateArticleDto.targetLanguage,
                    translateArticleDto.sourceLanguage,
                ),
                {
                    maxOutputTokens: 4096,
                    temperature: 0.2,
                },
            );

            this.aiUsageService.trackTokens(result.usageMetadata);

            var response: TranslateArticleResponse = {
                articleId: article.id,
                translatedText: result.text,
                detectedLanguage: translateArticleDto.sourceLanguage ?? "auto",
            };

            this.aiCacheService.set(cacheKey, response);

            return response;
        });
    }

    async analyzeArticle(
        articleId: string,
        analyzeArticleDto: AnalyzeArticleDto,
    ): Promise<AnalyzeArticleResponse> {
        return this.trackOperation("analyze", async () => {
            this.aiUsageService.trackRequest("analyze");

            var article = await this.articleService.findOne(articleId);
            var task = analyzeArticleDto.task ?? "review";

            var result = await this.geminiService.generateText(
                buildAnalyzeArticlePrompt(article.title, article.content, task),
                {
                    maxOutputTokens: 2048,
                    temperature: 0.2,
                },
            );

            this.aiUsageService.trackTokens(result.usageMetadata);

            return {
                articleId: article.id,
                ...validateAnalyzeResponse(result.text),
            };
        });
    }

    getUsageStats() {
        return ({
            usage: this.aiUsageService.getStats(),
            cache: this.aiCacheService.getStats(),
        });
    }

    getDiagnostics() {
        return ({
            model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
            baseUrl: process.env.GEMINI_API_BASE_URL ?? "https://generativelanguage.googleapis.com",
            hasApiKey: Boolean(process.env.GEMINI_API_KEY),
            rateLimitRpm: Number(process.env.AI_RATE_LIMIT_RPM ?? 20),
            cache: this.aiCacheService.getStats(),
            usage: this.aiUsageService.getStats(),
            observability: this.aiObservabilityService.getStats(),
            conversationContext: this.aiConversationContextService.getStats(),
        });
    }

    private async trackOperation<T>(
        endpoint: "generate" | "summarize" | "translate" | "analyze",
        operation: () => Promise<T>,
    ): Promise<T> {
        var startedAt = Date.now();

        try {
            var result = await operation();
            this.aiObservabilityService.trackLatency(endpoint, Date.now() - startedAt, true);

            return result;
        } catch (error) {
            this.aiObservabilityService.trackLatency(endpoint, Date.now() - startedAt, false);

            throw error;
        }
    }

    private getSummaryTokenLimit(maxLength: "short" | "medium" | "detailed"): number {
        if (maxLength === "short") {
            return 256;
        }

        if (maxLength === "detailed") {
            return 1024;
        }

        return 512;
    }

}