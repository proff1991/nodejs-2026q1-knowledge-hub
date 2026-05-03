import { InternalServerErrorException, ServiceUnavailableException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiService } from "../../../src/ai/gemini.service";

type MockFetch = ReturnType<typeof vi.fn>;

describe("GeminiService", () => {
    var service: GeminiService;
    var fetchMock: MockFetch;

    beforeEach(() => {
        process.env.GEMINI_API_KEY = "test-api-key";
        process.env.GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com";
        process.env.GEMINI_MODEL = "gemini-2.5-flash";

        fetchMock = vi.fn();
        global.fetch = fetchMock as unknown as typeof fetch;

        service = new GeminiService();

        vi.clearAllMocks();
    });

    it("should call Gemini generateContent endpoint and return text", async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: "Generated text",
                            },
                        ],
                    },
                },
            ],
            usageMetadata: {
                promptTokenCount: 10,
                candidatesTokenCount: 5,
                totalTokenCount: 15,
            },
        }), {
            status: 200,
        }));

        var result = await service.generateText("Hello", {
            maxOutputTokens: 100,
            temperature: 0.2,
        });

        expect(fetchMock).toHaveBeenCalledWith(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=test-api-key",
            expect.objectContaining({
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: expect.any(String),
            }),
        );

        var requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);

        expect(requestBody).toEqual({
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: "Hello",
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 100,
            },
        });

        expect(result).toEqual({
            text: "Generated text",
            model: "gemini-2.5-flash",
            usageMetadata: {
                promptTokenCount: 10,
                candidatesTokenCount: 5,
                totalTokenCount: 15,
            },
        });
    });

    it("should support model name with models prefix", async () => {
        process.env.GEMINI_MODEL = "models/gemini-2.5-flash";

        fetchMock.mockResolvedValue(new Response(JSON.stringify({
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: "Generated text",
                            },
                        ],
                    },
                },
            ],
        }), {
            status: 200,
        }));

        await service.generateText("Hello");

        expect(fetchMock.mock.calls[0][0]).toBe(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=test-api-key",
        );
    });

    it("should throw internal server error when api key is missing", async () => {
        delete process.env.GEMINI_API_KEY;

        await expect(service.generateText("Hello")).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it("should map Gemini auth error to internal server error", async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({
            error: {
                code: 403,
                message: "Invalid API key",
                status: "PERMISSION_DENIED",
            },
        }), {
            status: 403,
        }));

        await expect(service.generateText("Hello")).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });

    it("should map network error to service unavailable", async () => {
        fetchMock.mockRejectedValue(new Error("Network error"));

        await expect(service.generateText("Hello")).rejects.toBeInstanceOf(
            ServiceUnavailableException,
        );
    });
});