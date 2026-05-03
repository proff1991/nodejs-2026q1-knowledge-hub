import { describe, expect, it } from "vitest";
import { AiConversationContextService } from "../../../src/ai/ai-conversation-context.service";

describe("AiConversationContextService", () => {
    it("should create session id when it is missing", () => {
        var service = new AiConversationContextService();

        var sessionId = service.resolveSessionId();

        expect(sessionId).toEqual(expect.any(String));
        expect(service.getStats()).toEqual({
            activeSessions: 1,
            totalMessages: 0,
            maxMessagesPerSession: 10,
            maxSessions: 100,
        });
    });

    it("should reuse provided session id and store turns", () => {
        var service = new AiConversationContextService();
        var sessionId = "550e8400-e29b-41d4-a716-446655440000";

        var resolvedSessionId = service.resolveSessionId(sessionId);

        service.addTurn(sessionId, "Remember Nest.js", "OK");

        expect(resolvedSessionId).toBe(sessionId);
        expect(service.getMessages(sessionId)).toEqual([
            {
                role: "user",
                text: "Remember Nest.js",
                createdAt: expect.any(String),
            },
            {
                role: "assistant",
                text: "OK",
                createdAt: expect.any(String),
            },
        ]);

        expect(service.getStats().totalMessages).toBe(2);
    });

    it("should keep only last 10 messages in one session", () => {
        var service = new AiConversationContextService();
        var sessionId = "550e8400-e29b-41d4-a716-446655440000";

        service.resolveSessionId(sessionId);

        for (var index = 0; index < 6; index++) {
            service.addTurn(sessionId, `question ${index}`, `answer ${index}`);
        }

        var messages = service.getMessages(sessionId);

        expect(messages).toHaveLength(10);
        expect(messages[0].text).toBe("question 1");
        expect(messages[9].text).toBe("answer 5");
    });

    it("should return empty messages for unknown session", () => {
        var service = new AiConversationContextService();

        expect(service.getMessages("unknown-session")).toEqual([]);
    });

    it("should create session inside addTurn when session does not exist", () => {
        var service = new AiConversationContextService();
        var sessionId = "550e8400-e29b-41d4-a716-446655440000";

        service.addTurn(sessionId, "Hello", "Hi");

        expect(service.getMessages(sessionId)).toHaveLength(2);
        expect(service.getStats()).toEqual({
            activeSessions: 1,
            totalMessages: 2,
            maxMessagesPerSession: 10,
            maxSessions: 100,
        });
    });

    it("should trim old sessions when max sessions limit is exceeded", () => {
        var service = new AiConversationContextService();

        for (var index = 0; index < 101; index++) {
            var sessionId = `550e8400-e29b-41d4-a716-44665544${String(index).padStart(4, "0")}`;

            service.resolveSessionId(sessionId);
            service.addTurn(sessionId, `question ${index}`, `answer ${index}`);
        }

        expect(service.getStats().activeSessions).toBe(100);
    });

});