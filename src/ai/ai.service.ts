import { Injectable } from "@nestjs/common";
import { ArticleService } from "../article/article.service";
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
    , ParsedAnalyzeArticleResponse
    , SummarizeArticleResponse
    , TranslateArticleResponse
} from "./types/ai.types";

@Injectable()
export class AiService {
    constructor(
        private readonly geminiService: GeminiService,
        private readonly articleService: ArticleService,
    ) { }

    async generate(generateDto: GenerateDto): Promise<GenerateAiResponse> {
        var result = await this.geminiService.generateText(
            buildGenericPrompt(generateDto.prompt),
            {
                maxOutputTokens: generateDto.maxOutputTokens,
                temperature: generateDto.temperature,
            },
        );

        return {
            text: result.text,
            model: result.model,
        };
    }

    async summarizeArticle(
        articleId: string,
        summarizeArticleDto: SummarizeArticleDto,
    ): Promise<SummarizeArticleResponse> {
        var article = await this.articleService.findOne(articleId);
        var maxLength = summarizeArticleDto.maxLength ?? "medium";

        var result = await this.geminiService.generateText(
            buildSummarizeArticlePrompt(article.title, article.content, maxLength),
            {
                maxOutputTokens: this.getSummaryTokenLimit(maxLength),
                temperature: 0.3,
            },
        );

        return {
            articleId: article.id,
            summary: result.text,
            originalLength: article.content.length,
            summaryLength: result.text.length,
        };
    }

    async translateArticle(
        articleId: string,
        translateArticleDto: TranslateArticleDto,
    ): Promise<TranslateArticleResponse> {
        var article = await this.articleService.findOne(articleId);

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

        return {
            articleId: article.id,
            translatedText: result.text,
            detectedLanguage: translateArticleDto.sourceLanguage ?? "auto",
        };
    }

    async analyzeArticle(
        articleId: string,
        analyzeArticleDto: AnalyzeArticleDto,
    ): Promise<AnalyzeArticleResponse> {
        var article = await this.articleService.findOne(articleId);
        var task = analyzeArticleDto.task ?? "review";

        var result = await this.geminiService.generateText(
            buildAnalyzeArticlePrompt(article.title, article.content, task),
            {
                maxOutputTokens: 2048,
                temperature: 0.2,
            },
        );

        return {
            articleId: article.id,
            ...this.parseAnalyzeResponse(result.text),
        };
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

    private parseAnalyzeResponse(rawText: string): Omit<AnalyzeArticleResponse, "articleId"> {
        try {
            var parsed = JSON.parse(this.stripJsonFence(rawText)) as ParsedAnalyzeArticleResponse;
            var analysis = typeof parsed.analysis === "string" ? parsed.analysis : rawText;
            var suggestions = Array.isArray(parsed.suggestions)
                ? parsed.suggestions.filter((suggestion) => typeof suggestion === "string")
                : [];
            var severity = this.normalizeSeverity(parsed.severity);

            return {
                analysis,
                suggestions,
                severity,
            };
        } catch (error) {
            return {
                analysis: rawText,
                suggestions: [],
                severity: "info",
            };
        }
    }

    private stripJsonFence(rawText: string): string {
        return rawText
            .trim()
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
    }

    private normalizeSeverity(severity: unknown): "info" | "warning" | "error" {
        if (severity === "warning") {
            return "warning";
        }

        if (severity === "error") {
            return "error";
        }

        return "info";
    }
}