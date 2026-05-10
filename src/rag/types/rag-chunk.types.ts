export type RagArticleChunkSource = {
    articleId: string;
    articleTitle: string;
    articleContent: string;
    articleStatus: string;
    categoryId: string | null;
    tags: string[];
    updatedAt: number;
};

export type RagArticleChunk = {
    articleId: string;
    articleTitle: string;
    articleStatus: string;
    categoryId: string | null;
    tags: string[];
    chunkIndex: number;
    chunk: string;
    updatedAt: number;
};