import { Injectable } from "@nestjs/common";
import { GeminiService } from "../ai/gemini.service";
import { RagChatRequestDto } from "./dto/rag-chat-request.dto";
import { RagConversationMemoryService } from "./rag-conversation-memory.service";
import { RagSearchService } from "./rag-search.service";
import {
    RagChatHistoryResponse
    , RagChatResponse
    , RagChatSource
    , RagConversationMessage
} from "./types/rag-chat.types";
import { RagSearchResult } from "./types/rag-search.types";

@Injectable()
export class RagChatService {
    private readonly searchLimit = 5;

    constructor(
        private readonly geminiService: GeminiService
        , private readonly ragSearchService: RagSearchService
        , private readonly memoryService: RagConversationMemoryService
    ) { }

    async chat(request: RagChatRequestDto): Promise<RagChatResponse> {
        var conversationId = request.conversationId ?? this.memoryService.createConversationId();
        var history = this.memoryService.getMessages(conversationId);
        var searchResponse = await this.ragSearchService.search({
            query: request.question
            , limit: this.searchLimit
        });

        var sources = this.createSources(searchResponse.results);

        if (sources.length === 0) {
            var answerWithoutSources = "I do not have enough information in the indexed Knowledge Hub articles to answer this question.";

            this.memoryService.addMessage(conversationId, "user", request.question);
            this.memoryService.addMessage(conversationId, "assistant", answerWithoutSources);

            return {
                answer: answerWithoutSources
                , sources: []
                , conversationId
            };
        }

        var prompt = this.buildPrompt(request.question, searchResponse.results, history);
        var generated = await this.geminiService.generateText(prompt
            , {
                temperature: 0.2
                , maxOutputTokens: 800
            });

        this.memoryService.addMessage(conversationId, "user", request.question);
        this.memoryService.addMessage(conversationId, "assistant", generated.text);

        return {
            answer: generated.text
            , sources
            , conversationId
        };
    }

    getHistory(conversationId: string): RagChatHistoryResponse {
        return {
            conversationId
            , messages: this.memoryService.getMessages(conversationId)
        };
    }

    private createSources(results: RagSearchResult[]): RagChatSource[] {
        return results.map((result) => ({
            articleId: result.articleId
            , articleTitle: result.articleTitle
            , relevantChunk: result.chunk
        }));
    }

    private buildPrompt(
        question: string
        , results: RagSearchResult[]
        , history: RagConversationMessage[]
    ): string {
        return [
            "You are a Knowledge Hub RAG assistant."
            , "Answer the user question using only the provided Knowledge Hub context."
            , "If the context is insufficient, say that the indexed Knowledge Hub articles do not contain enough information."
            , "Do not invent facts that are not present in the context."
            , ""
            , "Conversation history:"
            , this.formatHistory(history)
            , ""
            , "Knowledge Hub context:"
            , this.formatContext(results)
            , ""
            , "User question:"
            , question
            , ""
            , "Answer:"
        ].join("\n");
    }

    private formatHistory(history: RagConversationMessage[]): string {
        if (history.length === 0) {
            return "No previous messages.";
        }

        return history
            .map((message) => `${message.role}: ${message.content}`)
            .join("\n");
    }

    private formatContext(results: RagSearchResult[]): string {
        return results
            .map((result, index) =>
                [
                    `[Source ${index + 1}]`
                    , `Article ID: ${result.articleId}`
                    , `Article title: ${result.articleTitle}`
                    , `Similarity: ${result.similarity}`
                    , "Chunk:"
                    , result.chunk
                ].join("\n")
            )
            .join("\n\n");
    }
}