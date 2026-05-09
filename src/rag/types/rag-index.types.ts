export type RagIndexArticle = {
    id: string;
    title: string;
    content: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    categoryId: string | null;
    updatedAt: Date;
    tags: Array<{
        name: string;
    }>;
};

export type RagIndexResponse = {
    indexedArticles: number;
    indexedChunks: number;
    vectorCollection: string;
};