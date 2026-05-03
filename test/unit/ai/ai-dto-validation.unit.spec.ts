import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { AiArticleParamDto } from "../../../src/ai/dto/ai-article-param.dto";
import { AnalyzeArticleDto } from "../../../src/ai/dto/analyze-article.dto";
import { GenerateDto } from "../../../src/ai/dto/generate.dto";
import { SummarizeArticleDto } from "../../../src/ai/dto/summarize-article.dto";
import { TranslateArticleDto } from "../../../src/ai/dto/translate-article.dto";

var validUuid = "550e8400-e29b-41d4-a716-446655440000";

var validateDto = async <T extends object>(
    dtoClass: new () => T,
    payload: Record<string, unknown>,
) => validate(plainToInstance(dtoClass, payload));

var expectValidationToPass = async <T extends object>(
    dtoClass: new () => T,
    payload: Record<string, unknown>,
) => {
    var errors = await validateDto(dtoClass, payload);

    expect(errors).toHaveLength(0);
};

var expectValidationToFail = async <T extends object>(
    dtoClass: new () => T,
    payload: Record<string, unknown>,
) => {
    var errors = await validateDto(dtoClass, payload);

    expect(errors.length).toBeGreaterThan(0);
};

describe("AI DTO validation", () => {
    it("should validate article id param", async () => {
        await expectValidationToPass(AiArticleParamDto, {
            articleId: validUuid,
        });

        await expectValidationToFail(AiArticleParamDto, {
            articleId: "not-uuid",
        });
    });

    it("should validate summarize body", async () => {
        await expectValidationToPass(SummarizeArticleDto, {});
        await expectValidationToPass(SummarizeArticleDto, {
            maxLength: "short",
        });
        await expectValidationToPass(SummarizeArticleDto, {
            maxLength: "medium",
        });
        await expectValidationToPass(SummarizeArticleDto, {
            maxLength: "detailed",
        });

        await expectValidationToFail(SummarizeArticleDto, {
            maxLength: "huge",
        });
    });

    it("should validate translate body", async () => {
        await expectValidationToPass(TranslateArticleDto, {
            targetLanguage: "Esperanto",
        });

        await expectValidationToPass(TranslateArticleDto, {
            targetLanguage: "Esperanto",
            sourceLanguage: "English",
        });

        await expectValidationToFail(TranslateArticleDto, {});
        await expectValidationToFail(TranslateArticleDto, {
            targetLanguage: "",
        });
    });

    it("should validate analyze body", async () => {
        await expectValidationToPass(AnalyzeArticleDto, {});
        await expectValidationToPass(AnalyzeArticleDto, {
            task: "review",
        });
        await expectValidationToPass(AnalyzeArticleDto, {
            task: "bugs",
        });
        await expectValidationToPass(AnalyzeArticleDto, {
            task: "optimize",
        });
        await expectValidationToPass(AnalyzeArticleDto, {
            task: "explain",
        });

        await expectValidationToFail(AnalyzeArticleDto, {
            task: "security",
        });
    });

    it("should validate generate body", async () => {
        await expectValidationToPass(GenerateDto, {
            prompt: "Hello",
        });

        await expectValidationToPass(GenerateDto, {
            prompt: "Hello",
            sessionId: validUuid,
            maxOutputTokens: 100,
            temperature: 0.2,
        });

        await expectValidationToFail(GenerateDto, {});
        await expectValidationToFail(GenerateDto, {
            prompt: "",
        });
        await expectValidationToFail(GenerateDto, {
            prompt: "Hello",
            sessionId: "not-uuid",
        });
        await expectValidationToFail(GenerateDto, {
            prompt: "Hello",
            maxOutputTokens: 9000,
        });
        await expectValidationToFail(GenerateDto, {
            prompt: "Hello",
            temperature: 3,
        });
    });
});