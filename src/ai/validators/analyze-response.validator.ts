import { AnalyzeArticleResponse, ParsedAnalyzeArticleResponse } from "../types/ai.types";

type AnalyzeValidationResult = Omit<AnalyzeArticleResponse, "articleId">;

export var validateAnalyzeResponse = (rawText: string): AnalyzeValidationResult => {
    try {
        var parsed = JSON.parse(stripJsonFence(rawText)) as ParsedAnalyzeArticleResponse;

        if (!isAnalyzeResponseShape(parsed)) {
            return createFallbackAnalyzeResponse(rawText);
        }

        return {
            analysis: parsed.analysis,
            suggestions: parsed.suggestions,
            severity: parsed.severity,
        };
    } catch (error) {
        return createFallbackAnalyzeResponse(rawText);
    }
};

var isAnalyzeResponseShape = (
    value: ParsedAnalyzeArticleResponse,
): value is {
    analysis: string;
    suggestions: string[];
    severity: "info" | "warning" | "error";
} => {
    if (!value || typeof value !== "object") {
        return false;
    }

    if (typeof value.analysis !== "string") {
        return false;
    }

    if (!Array.isArray(value.suggestions)) {
        return false;
    }

    if (!value.suggestions.every((suggestion) => typeof suggestion === "string")) {
        return false;
    }

    if (!isSeverity(value.severity)) {
        return false;
    }

    return true;
};

var isSeverity = (severity: unknown): severity is "info" | "warning" | "error" => {
    if (severity === "info") {
        return true;
    }

    if (severity === "warning") {
        return true;
    }

    if (severity === "error") {
        return true;
    }

    return false;
};

var stripJsonFence = (rawText: string): string =>
    rawText
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

var createFallbackAnalyzeResponse = (rawText: string): AnalyzeValidationResult => ({
    analysis: rawText,
    suggestions: [],
    severity: "info",
});