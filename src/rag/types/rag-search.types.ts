export type RagRetrievalMode = "semantic" | "lexical" | "hybrid";

export type RagSearchResult = {
    articleId: string;
    articleTitle: string;
    chunk: string;
    similarity: number;
    semanticSimilarity?: number;
    lexicalScore?: number;
    rerankScore?: number;
    retrievalMode?: RagRetrievalMode;
};

export type RagSearchCandidate = RagSearchResult & {
    pointId: string;
    chunkIndex: number;
};

export type RagSearchResponse = {
    results: RagSearchResult[];
};

export type RagSearchPayload = {
    articleId?: unknown;
    articleTitle?: unknown;
    articleStatus?: unknown;
    categoryId?: unknown;
    tags?: unknown;
    chunkIndex?: unknown;
    chunk?: unknown;
};
