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

export type GeminiEmbeddingTaskType =
    | "TASK_TYPE_UNSPECIFIED"
    | "RETRIEVAL_QUERY"
    | "RETRIEVAL_DOCUMENT"
    | "SEMANTIC_SIMILARITY"
    | "CLASSIFICATION"
    | "CLUSTERING"
    | "QUESTION_ANSWERING"
    | "FACT_VERIFICATION"
    | "CODE_RETRIEVAL_QUERY";

export type GeminiEmbeddingOptions = {
    taskType?: GeminiEmbeddingTaskType;
    title?: string;
    outputDimensionality?: number;
};

export type GeminiEmbedContentRequest = {
    model: string;
    content: GeminiContent;
    taskType?: GeminiEmbeddingTaskType;
    title?: string;
    outputDimensionality?: number;
};

export type GeminiBatchEmbedContentRequest = {
    requests: GeminiEmbedContentRequest[];
};

export type GeminiContentEmbedding = {
    values?: number[];
};

export type GeminiBatchEmbedContentResponse = {
    embeddings?: GeminiContentEmbedding[];
    usageMetadata?: {
        promptTokenCount?: number;
        totalTokenCount?: number;
    };
};

export type GeminiEmbeddingResult = {
    values: number[];
    model: string;
    usageMetadata?: GeminiBatchEmbedContentResponse["usageMetadata"];
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