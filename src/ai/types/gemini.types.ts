export type GeminiPart = {
    text?: string;
};

export type GeminiContent = {
    role?: string;
    parts?: GeminiPart[];
};

export type GeminiGenerateContentRequest = {
    contents: GeminiContent[];
    generationConfig?: {
        temperature?: number;
        maxOutputTokens?: number;
    };
};

export type GeminiGenerateContentResponse = {
    candidates?: Array<{
        content?: GeminiContent;
        finishReason?: string;
    }>;
    usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
    };
};

export type GeminiGenerateTextResult = {
    text: string;
    model: string;
    usageMetadata?: GeminiGenerateContentResponse["usageMetadata"];
};

export type GeminiErrorResponse = {
    error?: {
        code?: number;
        message?: string;
        status?: string;
        details?: Array<{
            "@type"?: string;
            retryDelay?: string;
        }>;
    };
};