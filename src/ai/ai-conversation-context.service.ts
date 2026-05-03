import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { ConversationContextMessage } from "./types/ai.types";

type ConversationSession = {
    sessionId: string;
    createdAt: string;
    updatedAt: string;
    messages: ConversationContextMessage[];
};

@Injectable()
export class AiConversationContextService {
    private readonly sessions = new Map<string, ConversationSession>();
    private readonly maxMessagesPerSession = 10;
    private readonly maxSessions = 100;

    resolveSessionId(sessionId?: string): string {
        var resolvedSessionId = sessionId ?? randomUUID();

        if (!this.sessions.has(resolvedSessionId)) {
            this.createSession(resolvedSessionId);
        }

        return resolvedSessionId;
    }

    getMessages(sessionId: string): ConversationContextMessage[] {
        var session = this.sessions.get(sessionId);

        if (!session) {
            return [];
        }

        return [...session.messages];
    }

    addTurn(sessionId: string, userPrompt: string, assistantText: string): void {
        var session = this.sessions.get(sessionId);

        if (!session) {
            session = this.createSession(sessionId);
        }

        var now = new Date().toISOString();

        session.messages.push({
            role: "user",
            text: userPrompt,
            createdAt: now,
        });

        session.messages.push({
            role: "assistant",
            text: assistantText,
            createdAt: now,
        });

        session.updatedAt = now;

        this.trimSessionMessages(session);
        this.trimSessions();
    }

    getStats() {
        var totalMessages = 0;

        this.sessions.forEach((session) => {
            totalMessages += session.messages.length;
        });

        return {
            activeSessions: this.sessions.size,
            totalMessages,
            maxMessagesPerSession: this.maxMessagesPerSession,
            maxSessions: this.maxSessions,
        };
    }

    private createSession(sessionId: string): ConversationSession {
        var now = new Date().toISOString();
        var session: ConversationSession = {
            sessionId,
            createdAt: now,
            updatedAt: now,
            messages: [],
        };

        this.sessions.set(sessionId, session);

        return session;
    }

    private trimSessionMessages(session: ConversationSession): void {
        while (session.messages.length > this.maxMessagesPerSession) {
            session.messages.shift();
        }
    }

    private trimSessions(): void {
        if (this.sessions.size <= this.maxSessions) {
            return;
        }

        var oldestSessionId: string | null = null;
        var oldestUpdatedAt = Number.POSITIVE_INFINITY;

        this.sessions.forEach((session) => {
            var updatedAt = new Date(session.updatedAt).getTime();

            if (updatedAt < oldestUpdatedAt) {
                oldestUpdatedAt = updatedAt;
                oldestSessionId = session.sessionId;
            }
        });

        if (oldestSessionId) {
            this.sessions.delete(oldestSessionId);
        }
    }
}