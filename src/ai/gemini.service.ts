import {
    Injectable
    , InternalServerErrorException
    , ServiceUnavailableException
} from "@nestjs/common";
import {
    GeminiErrorResponse,
    GeminiGenerateContentRequest,
    GeminiGenerateContentResponse,
    GeminiGenerateTextResult,
} from "./types/gemini.types";

@Injectable()
export class GeminiService {
    private readonly defaultBaseUrl = "https://generativelanguage.googleapis.com";
    private readonly defaultModel = "gemini-2.0-flash";
    private readonly requestTimeoutMs = 30000;

    async generateText(
        prompt: string,
        options?: {
            maxOutputTokens?: number;
            temperature?: number;
        },
    ): Promise<GeminiGenerateTextResult> {
        var response = await this.fetchGenerateContent(prompt, options);
        var responseData = await this.readResponse(response);

        if (!response.ok) {
            this.throwGeminiError(response.status, responseData);
        }

        var geminiResponse = responseData as GeminiGenerateContentResponse;
        var text = this.extractText(geminiResponse);

        return {
            text,
            model: this.getModel(),
            usageMetadata: geminiResponse.usageMetadata,
        };
    }

    private async fetchGenerateContent(
        prompt: string,
        options?: {
            maxOutputTokens?: number;
            temperature?: number;
        },
    ): Promise<Response> {
        var apiKey = this.getApiKey();
        var url = this.buildGenerateContentUrl(apiKey);
        var controller = new AbortController();
        var timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

        try {
            return await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(this.createRequestBody(prompt, options)),
                signal: controller.signal,
            });
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                throw new ServiceUnavailableException("Gemini API request timed out");
            }

            throw new ServiceUnavailableException("Gemini API is unavailable");
        } finally {
            clearTimeout(timeout);
        }
    }

    private getApiKey(): string {
        var apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new InternalServerErrorException("Gemini API key is not configured");
        }

        return apiKey;
    }

    private getBaseUrl(): string {
        return (process.env.GEMINI_API_BASE_URL || this.defaultBaseUrl).replace(/\/+$/, "");
    }

    private getModel(): string {
        return process.env.GEMINI_MODEL || this.defaultModel;
    }

    private getModelPath(): string {
        var model = this.getModel();

        if (model.startsWith("models/")) {
            return model;
        }

        return `models/${model}`;
    }

    private buildGenerateContentUrl(apiKey: string): string {
        var baseUrl = this.getBaseUrl();
        var modelPath = this.getModelPath();

        return `${baseUrl}/v1beta/${modelPath}:generateContent?key=${encodeURIComponent(apiKey)}`;
    }

    private createRequestBody(
        prompt: string,
        options?: {
            maxOutputTokens?: number;
            temperature?: number;
        },
    ): GeminiGenerateContentRequest {
        return {
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: prompt,
                        },
                    ],
                },
            ],
            generationConfig: {
                ...(typeof options?.temperature !== "undefined"
                    ? { temperature: options.temperature }
                    : {}),
                ...(typeof options?.maxOutputTokens !== "undefined"
                    ? { maxOutputTokens: options.maxOutputTokens }
                    : {}),
            },
        };
    }

    private async readResponse(response: Response): Promise<unknown> {
        var rawText = await response.text();

        if (!rawText) {
            return {};
        }

        try {
            return JSON.parse(rawText) as unknown;
        } catch (error) {
            return {
                error: {
                    message: rawText,
                },
            };
        }
    }

    private extractText(response: GeminiGenerateContentResponse): string {
        var parts = response.candidates?.[0]?.content?.parts ?? [];
        var text = parts
            .map((part) => part.text ?? "")
            .join("")
            .trim();

        if (!text) {
            throw new ServiceUnavailableException("Gemini API returned an empty response");
        }

        return text;
    }

    private throwGeminiError(statusCode: number, responseData: unknown): never {
        var errorResponse = responseData as GeminiErrorResponse;
        var upstreamStatus = errorResponse.error?.status;

        if (statusCode === 401 || statusCode === 403) {
            throw new InternalServerErrorException("Gemini API authentication failed");
        }

        if (statusCode === 429 || upstreamStatus === "RESOURCE_EXHAUSTED") {
            throw new ServiceUnavailableException("Gemini API rate limit exceeded");
        }

        if (statusCode >= 500) {
            throw new ServiceUnavailableException("Gemini API is unavailable");
        }

        throw new ServiceUnavailableException("Gemini API request failed");
    }
}