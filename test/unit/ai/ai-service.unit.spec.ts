import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiCacheService } from "../../../src/ai/ai-cache.service";
import { AiConversationContextService } from "../../../src/ai/ai-conversation-context.service";
import { AiObservabilityService } from "../../../src/ai/ai-observability.service";
import { AiService } from "../../../src/ai/ai.service";
import { AiUsageService } from "../../../src/ai/ai-usage.service";
import { GeminiService } from "../../../src/ai/gemini.service";
import { ArticleService } from "../../../src/article/article.service";

type MockFunction = ReturnType<typeof vi.fn>;

describe("AiService", () => {
    var service: AiService;

    var geminiMock: {
        generateText: MockFunction;
    };

    var articleMock: {
        findOne: MockFunction;
    };

    var article = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "TypeScript in backend services",
        content: "Why TypeScript improves maintainability in backend projects.",
        updatedAt: 1777813947931,
    };

    beforeEach(() => {
        process.env.AI_CACHE_TTL_SEC = "300";
        process.env.GEMINI_MODEL = "gemini-2.5-flash";

        geminiMock = {
            generateText: vi.fn(),
        };

        articleMock = {
            findOne: vi.fn().mockResolvedValue(article),
        };

        service = new AiService(
            geminiMock as unknown as GeminiService,
            articleMock as unknown as ArticleService,
            new AiCacheService(),
            new AiUsageService(),
            new AiObservabilityService(),
            new AiConversationContextService(),
        );

        vi.clearAllMocks();
    });

    it("should generate generic response and return session id", async () => {
        geminiMock.generateText.mockResolvedValue({
            text: "OK",
            model: "gemini-2.5-flash",
            usageMetadata: {
                promptTokenCount: 10,
                candidatesTokenCount: 1,
                totalTokenCount: 11,
            },
        });

        var result = await service.generate({
            prompt: "Remember Nest.js",
            maxOutputTokens: 100,
            temperature: 0.2,
        });

        expect(result).toEqual({
            text: "OK",
            model: "gemini-2.5-flash",
            sessionId: expect.any(String),
        });

        expect(geminiMock.generateText).toHaveBeenCalledTimes(1);
        expect(service.getDiagnostics().conversationContext).toEqual({
            activeSessions: 1,
            totalMessages: 2,
            maxMessagesPerSession: 10,
            maxSessions: 100,
        });
    });

    it("should use conversation context in next generate request", async () => {
        geminiMock.generateText
            .mockResolvedValueOnce({
                text: "OK",
                model: "gemini-2.5-flash",
            })
            .mockResolvedValueOnce({
                text: "Your favorite framework is Nest.js.",
                model: "gemini-2.5-flash",
            });

        var firstResponse = await service.generate({
            prompt: "Remember that my favorite framework is Nest.js",
        });

        var secondResponse = await service.generate({
            sessionId: firstResponse.sessionId,
            prompt: "What is my favorite framework?",
        });

        var secondPrompt = geminiMock.generateText.mock.calls[1][0];

        expect(secondResponse.sessionId).toBe(firstResponse.sessionId);
        expect(secondPrompt).toContain("Remember that my favorite framework is Nest.js");
        expect(secondPrompt).toContain("OK");
    });

    it("should summarize article and cache response", async () => {
        var summary = "TypeScript improves backend maintainability.";

        geminiMock.generateText.mockResolvedValue({
            text: summary,
            model: "gemini-2.5-flash",
            usageMetadata: {
                promptTokenCount: 59,
                candidatesTokenCount: 8,
                totalTokenCount: 67,
            },
        });

        var firstResult = await service.summarizeArticle(article.id, {
            maxLength: "short",
        });

        var secondResult = await service.summarizeArticle(article.id, {
            maxLength: "short",
        });

        expect(firstResult).toEqual({
            articleId: article.id,
            summary,
            originalLength: article.content.length,
            summaryLength: summary.length,
        });

        expect(secondResult).toEqual(firstResult);
        expect(articleMock.findOne).toHaveBeenCalledTimes(2);
        expect(geminiMock.generateText).toHaveBeenCalledTimes(1);
        expect(service.getDiagnostics().cache.hits).toBe(1);
        expect(service.getDiagnostics().cache.misses).toBe(1);
    });

    it("should translate article and cache response", async () => {
        geminiMock.generateText.mockResolvedValue({
            text: "TypeScript plibonigas prizorgeblecon en backend-projektoj.",
            model: "gemini-2.5-flash",
        });

        var firstResult = await service.translateArticle(article.id, {
            targetLanguage: "Esperanto",
            sourceLanguage: "English",
        });

        var secondResult = await service.translateArticle(article.id, {
            targetLanguage: "Esperanto",
            sourceLanguage: "English",
        });

        expect(firstResult).toEqual({
            articleId: article.id,
            translatedText: "TypeScript plibonigas prizorgeblecon en backend-projektoj.",
            detectedLanguage: "English",
        });

        expect(secondResult).toEqual(firstResult);
        expect(geminiMock.generateText).toHaveBeenCalledTimes(1);
        expect(service.getDiagnostics().cache.hits).toBe(1);
    });

    it("should analyze article with structured response validation", async () => {
        geminiMock.generateText.mockResolvedValue({
            text: JSON.stringify({
                analysis: "Article is too short.",
                suggestions: ["Add examples"],
                severity: "warning",
            }),
            model: "gemini-2.5-flash",
        });

        var result = await service.analyzeArticle(article.id, {
            task: "review",
        });

        expect(result).toEqual({
            articleId: article.id,
            analysis: "Article is too short.",
            suggestions: ["Add examples"],
            severity: "warning",
        });
    });

    it("should fallback when analyze response is not valid JSON", async () => {
        geminiMock.generateText.mockResolvedValue({
            text: "Plain text analysis",
            model: "gemini-2.5-flash",
        });

        var result = await service.analyzeArticle(article.id, {
            task: "review",
        });

        expect(result).toEqual({
            articleId: article.id,
            analysis: "Plain text analysis",
            suggestions: [],
            severity: "info",
        });
    });

    it("should track failed operation in observability", async () => {
        geminiMock.generateText.mockRejectedValue(new Error("Gemini failed"));

        await expect(service.generate({
            prompt: "Hello",
        })).rejects.toThrow("Gemini failed");

        expect(service.getDiagnostics().observability.metricsByEndpoint.generate).toEqual({
            totalCalls: 1,
            successCalls: 0,
            failedCalls: 1,
            averageLatencyMs: expect.any(Number),
            minLatencyMs: expect.any(Number),
            maxLatencyMs: expect.any(Number),
        });
    });

    it("should use medium summary token limit by default", async () => {
        geminiMock.generateText.mockResolvedValue({
            text: "Medium summary",
            model: "gemini-2.5-flash",
        });

        await service.summarizeArticle(article.id, {});

        expect(geminiMock.generateText).toHaveBeenCalledWith(
            expect.any(String),
            {
                maxOutputTokens: 512,
                temperature: 0.3,
            },
        );
    });

    it("should use detailed summary token limit", async () => {
        geminiMock.generateText.mockResolvedValue({
            text: "Detailed summary",
            model: "gemini-2.5-flash",
        });

        await service.summarizeArticle(article.id, {
            maxLength: "detailed",
        });

        expect(geminiMock.generateText).toHaveBeenCalledWith(
            expect.any(String),
            {
                maxOutputTokens: 1024,
                temperature: 0.3,
            },
        );
    });

    it("should translate article with auto detected source language", async () => {
        geminiMock.generateText.mockResolvedValue({
            text: "Translated text",
            model: "gemini-2.5-flash",
        });

        var result = await service.translateArticle(article.id, {
            targetLanguage: "Esperanto",
        });

        expect(result.detectedLanguage).toBe("auto");
        expect(geminiMock.generateText.mock.calls[0][0]).toContain(
            "Detect the source language automatically.",
        );
    });
});