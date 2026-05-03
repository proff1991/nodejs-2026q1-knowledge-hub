export type GenerateAiResponse = {
    text: string;
    model: string;
};

export type SummarizeArticleResponse = {
    articleId: string;
    summary: string;
    originalLength: number;
    summaryLength: number;
};

export type TranslateArticleResponse = {
    articleId: string;
    translatedText: string;
    detectedLanguage: string;
};

export type AnalyzeArticleResponse = {
    articleId: string;
    analysis: string;
    suggestions: string[];
    severity: "info" | "warning" | "error";
};

export type ParsedAnalyzeArticleResponse = {
    analysis?: unknown;
    suggestions?: unknown;
    severity?: unknown;
};