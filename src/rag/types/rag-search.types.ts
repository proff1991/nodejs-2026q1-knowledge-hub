export type RagSearchResult = {
    articleId: string;
    articleTitle: string;
    chunk: string;
    similarity: number;
};

export type RagSearchResponse = {
    results: RagSearchResult[];
};

export type RagSearchPayload = {
    articleId?: unknown;
    articleTitle?: unknown;
    chunk?: unknown;
};