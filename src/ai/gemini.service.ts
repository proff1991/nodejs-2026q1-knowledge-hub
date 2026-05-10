import {
    Injectable
    , InternalServerErrorException
    , ServiceUnavailableException
} from "@nestjs/common";
import { AppLoggerService } from "../common/logger/app-logger.service";
import {
    GeminiBatchEmbedContentRequest
    , GeminiBatchEmbedContentResponse
    , GeminiEmbeddingOptions
    , GeminiEmbeddingResult
    , GeminiErrorResponse
    , GeminiGenerateContentRequest
    , GeminiGenerateContentResponse
    , GeminiGenerateTextResult
} from "./types/gemini.types";

@Injectable()
export class GeminiService {
    private readonly defaultBaseUrl = "https://generativelanguage.googleapis.com";
    private readonly defaultModel = "gemini-2.0-flash";
    private readonly defaultEmbeddingModel = "gemini-embedding-001";
    private readonly requestTimeoutMs = 30000;
    private readonly maxRetries = 3;

    constructor(private readonly logger: AppLoggerService) { }

    async generateText(
        prompt: string,
        options?: {
            maxOutputTokens?: number;
            temperature?: number;
        },
    ): Promise<GeminiGenerateTextResult> {
        var lastError: unknown = null;

        for (var attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await this.generateTextOnce(prompt, options, attempt);
            } catch (error) {
                lastError = error;

                if (!this.shouldRetry(error, attempt)) {
                    this.logGeminiFailure("Gemini text generation failed", error, {
                        attempt
                        , operation: "generateText"
                    });

                    throw error;
                }

                this.logGeminiFailure("Gemini text generation retry scheduled", error, {
                    attempt
                    , operation: "generateText"
                    , retryAfterMs: this.getBackoffMs(attempt)
                });

                await this.delay(this.getBackoffMs(attempt));
            }
        }

        throw lastError;
    }

    async embedText(text: string, options?: GeminiEmbeddingOptions): Promise<GeminiEmbeddingResult> {
        var results = await this.embedTexts([text], options);

        return results[0];
    }

    async embedTexts(texts: string[], options?: GeminiEmbeddingOptions): Promise<GeminiEmbeddingResult[]> {
        if (texts.length === 0) {
            return [];
        }

        var lastError: unknown = null;

        for (var attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await this.embedTextsOnce(texts, options, attempt);
            } catch (error) {
                lastError = error;

                if (!this.shouldRetry(error, attempt)) {
                    this.logGeminiFailure("Gemini embeddings failed", error, {
                        attempt
                        , operation: "embedTexts"
                        , textsCount: texts.length
                    });

                    throw error;
                }

                this.logGeminiFailure("Gemini embeddings retry scheduled", error, {
                    attempt
                    , operation: "embedTexts"
                    , textsCount: texts.length
                    , retryAfterMs: this.getBackoffMs(attempt)
                });

                await this.delay(this.getBackoffMs(attempt));
            }
        }

        throw lastError;
    }

    private async generateTextOnce(
        prompt: string,
        options: {
            maxOutputTokens?: number;
            temperature?: number;
        } | undefined,
        attempt: number,
    ): Promise<GeminiGenerateTextResult> {
        var response = await this.fetchGenerateContent(prompt, options);
        var responseData = await this.readResponse(response);

        if (!response.ok) {
            this.throwGeminiError(response.status, responseData, attempt);
        }

        var geminiResponse = responseData as GeminiGenerateContentResponse;
        var text = this.extractText(geminiResponse);

        return {
            text,
            model: this.getModel(),
            usageMetadata: geminiResponse.usageMetadata,
        };
    }

    private async embedTextsOnce(
        texts: string[],
        options: GeminiEmbeddingOptions | undefined,
        attempt: number,
    ): Promise<GeminiEmbeddingResult[]> {
        var response = await this.fetchBatchEmbedContents(texts, options);
        var responseData = await this.readResponse(response);

        if (!response.ok) {
            this.throwGeminiError(response.status, responseData, attempt);
        }

        var geminiResponse = responseData as GeminiBatchEmbedContentResponse;
        var embeddings = this.extractEmbeddings(geminiResponse, texts.length);
        var model = this.getEmbeddingModel();

        return embeddings.map((values) => ({
            values,
            model,
            usageMetadata: geminiResponse.usageMetadata,
        }));
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
            this.logGeminiFailure("Gemini text generation network request failed", error, {
                operation: "generateContent"
            });

            if (error instanceof Error && error.name === "AbortError") {
                throw new ServiceUnavailableException("Gemini API request timed out");
            }

            throw new ServiceUnavailableException("Gemini API is unavailable");
        } finally {
            clearTimeout(timeout);
        }
    }

    private async fetchBatchEmbedContents(
        texts: string[],
        options?: GeminiEmbeddingOptions,
    ): Promise<Response> {
        var apiKey = this.getApiKey();
        var url = this.buildBatchEmbedContentsUrl(apiKey);
        var controller = new AbortController();
        var timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

        try {
            return await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(this.createBatchEmbeddingRequestBody(texts, options)),
                signal: controller.signal,
            });
        } catch (error) {
            this.logGeminiFailure("Gemini embeddings network request failed", error, {
                operation: "batchEmbedContents"
                , textsCount: texts.length
            });

            if (error instanceof Error && error.name === "AbortError") {
                throw new ServiceUnavailableException("Gemini API embedding request timed out");
            }

            throw new ServiceUnavailableException("Gemini API embeddings are unavailable");
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

    private getEmbeddingModel(): string {
        return process.env.GEMINI_EMBEDDING_MODEL || this.defaultEmbeddingModel;
    }

    private getEmbeddingModelPath(): string {
        var model = this.getEmbeddingModel();

        if (model.startsWith("models/")) {
            return model;
        }

        return `models/${model}`;
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

    private buildBatchEmbedContentsUrl(apiKey: string): string {
        var baseUrl = this.getBaseUrl();
        var modelPath = this.getEmbeddingModelPath();

        return `${baseUrl}/v1beta/${modelPath}:batchEmbedContents?key=${encodeURIComponent(apiKey)}`;
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

    private createBatchEmbeddingRequestBody(
        texts: string[],
        options?: GeminiEmbeddingOptions,
    ): GeminiBatchEmbedContentRequest {
        var model = this.getEmbeddingModelPath();

        return {
            requests: texts.map((text) => ({
                model,
                content: {
                    parts: [
                        {
                            text,
                        },
                    ],
                },
                ...(typeof options?.taskType !== "undefined"
                    ? { taskType: options.taskType }
                    : {}),
                ...(typeof options?.title !== "undefined"
                    ? { title: options.title }
                    : {}),
                ...(typeof options?.outputDimensionality !== "undefined"
                    ? { outputDimensionality: options.outputDimensionality }
                    : {}),
            })),
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

    private extractEmbeddings(
        response: GeminiBatchEmbedContentResponse,
        expectedCount: number,
    ): number[][] {
        var embeddings = response.embeddings ?? [];

        if (embeddings.length !== expectedCount) {
            throw new ServiceUnavailableException("Gemini API returned unexpected embeddings count");
        }

        return embeddings.map((embedding) => {
            var values = embedding.values ?? [];

            if (values.length === 0) {
                throw new ServiceUnavailableException("Gemini API returned an empty embedding");
            }

            return values;
        });
    }

    private throwGeminiError(statusCode: number, responseData: unknown, attempt: number): never {
        var errorResponse = responseData as GeminiErrorResponse;
        var upstreamStatus = errorResponse.error?.status;
        var retryAfter = this.extractRetryAfter(errorResponse);

        this.logger.error(
            "Gemini API returned an error response"
            , undefined
            , "GeminiService"
            , {
                statusCode
                , upstreamStatus
                , attempt
                , retryAfter
                , message: errorResponse.error?.message
            }
        );

        if (statusCode === 401 || statusCode === 403) {
            throw new InternalServerErrorException("Gemini API authentication failed");
        }

        if (statusCode === 429 || upstreamStatus === "RESOURCE_EXHAUSTED") {
            throw new ServiceUnavailableException({
                message: "Gemini API rate limit exceeded",
                upstreamStatus,
                retryAfter,
                attempt,
            });
        }

        if (statusCode >= 500) {
            throw new ServiceUnavailableException({
                message: "Gemini API is unavailable",
                upstreamStatus,
                attempt,
            });
        }

        throw new ServiceUnavailableException({
            message: "Gemini API request failed",
            upstreamStatus,
            attempt,
        });
    }

    private shouldRetry(error: unknown, attempt: number): boolean {
        if (attempt >= this.maxRetries) {
            return false;
        }

        if (!(error instanceof ServiceUnavailableException)) {
            return false;
        }

        return true;
    }

    private getBackoffMs(attempt: number): number {
        return 300 * attempt * attempt;
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private logGeminiFailure(
        message: string
        , error: unknown
        , metadata: Record<string, unknown>
    ): void {
        var errorMessage = error instanceof Error
            ? error.message
            : "Unknown Gemini error";

        this.logger.error(
            message
            , undefined
            , "GeminiService"
            , {
                ...metadata
                , error: errorMessage
            }
        );
    }

    private extractRetryAfter(errorResponse: GeminiErrorResponse): number | null {
        var retryInfo = errorResponse.error?.details?.find((detail) =>
            detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
        );

        var retryDelay = retryInfo?.retryDelay;

        if (!retryDelay) {
            return null;
        }

        var match = retryDelay.match(/^(\d+)s$/);

        if (!match) {
            return null;
        }

        return Number(match[1]);
    }
}