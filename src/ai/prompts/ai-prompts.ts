import { ConversationContextMessage } from "../types/ai.types";

export let buildGenericPrompt = (
    prompt: string,
    contextMessages: ConversationContextMessage[] = [],
): string => {
    var contextSection = contextMessages.length === 0
        ? "No previous conversation context."
        : contextMessages
            .map((message) => `${message.role.toUpperCase()}: ${message.text}`)
            .join("\n");

    return [
        "You are an assistant inside the Knowledge Hub API.",
        "Answer clearly and helpfully.",
        "Use the previous conversation context only when it is relevant.",
        "",
        "Previous conversation context:",
        contextSection,
        "",
        "Current user request:",
        prompt,
    ].join("\n");
};

export let buildSummarizeArticlePrompt = (
    articleTitle: string,
    articleContent: string,
    maxLength: "short" | "medium" | "detailed",
): string =>
    [
        "You are an assistant inside the Knowledge Hub API.",
        "Summarize the article below.",
        `Summary length: ${maxLength}.`,
        "Return only the summary text. Do not include markdown headings.",
        "",
        `Article title: ${articleTitle}`,
        "",
        "Article content:",
        articleContent,
    ].join("\n");

export let buildTranslateArticlePrompt = (
    articleTitle: string,
    articleContent: string,
    targetLanguage: string,
    sourceLanguage?: string,
): string =>
    [
        "You are an assistant inside the Knowledge Hub API.",
        "Translate the article content below.",
        `Target language: ${targetLanguage}.`,
        sourceLanguage ? `Source language: ${sourceLanguage}.` : "Detect the source language automatically.",
        "Return only the translated text. Do not include markdown headings.",
        "",
        `Article title: ${articleTitle}`,
        "",
        "Article content:",
        articleContent,
    ].join("\n");

export let buildAnalyzeArticlePrompt = (
    articleTitle: string,
    articleContent: string,
    task: "review" | "bugs" | "optimize" | "explain",
): string =>
    [
        "You are an assistant inside the Knowledge Hub API.",
        "Analyze the article below.",
        `Analysis task: ${task}.`,
        "Return ONLY valid JSON without markdown fences.",
        "The JSON schema must be:",
        "{",
        '  "analysis": "string",',
        '  "suggestions": ["string"],',
        '  "severity": "info | warning | error"',
        "}",
        "",
        "Severity rules:",
        "- info: informational or minor improvements",
        "- warning: notable issues or important improvements",
        "- error: serious problems, incorrect or dangerous content",
        "",
        `Article title: ${articleTitle}`,
        "",
        "Article content:",
        articleContent,
    ].join("\n");