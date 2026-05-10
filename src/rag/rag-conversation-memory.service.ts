import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { RagConfigService } from "./rag-config.service";
import {
    RagConversationMessage
    , RagConversationRole
} from "./types/rag-chat.types";

@Injectable()
export class RagConversationMemoryService {
    private readonly conversations = new Map<string, RagConversationMessage[]>();

    constructor(private readonly config: RagConfigService) { }

    createConversationId(): string {
        return randomUUID();
    }

    getMessages(conversationId: string): RagConversationMessage[] {
        return [...(this.conversations.get(conversationId) ?? [])];
    }

    addMessage(
        conversationId: string
        , role: RagConversationRole
        , content: string
    ): void {
        var messages = this.conversations.get(conversationId) ?? [];

        messages.push({
            role
            , content
            , createdAt: new Date().toISOString()
        });

        this.conversations.set(conversationId, this.trimMessages(messages));
    }

    private trimMessages(messages: RagConversationMessage[]): RagConversationMessage[] {
        var maxMessages = this.config.getConversationMaxMessages();

        if (messages.length <= maxMessages) {
            return messages;
        }

        return messages.slice(messages.length - maxMessages);
    }
}