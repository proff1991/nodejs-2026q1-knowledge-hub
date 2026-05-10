export type RagConversationRole = "user" | "assistant";

export type RagConversationMessage = {
    role: RagConversationRole;
    content: string;
    createdAt: string;
};

export type RagChatSource = {
    articleId: string;
    articleTitle: string;
    relevantChunk: string;
};

export type RagChatResponse = {
    answer: string;
    sources: RagChatSource[];
    conversationId: string;
};

export type RagChatHistoryResponse = {
    conversationId: string;
    messages: RagConversationMessage[];
};