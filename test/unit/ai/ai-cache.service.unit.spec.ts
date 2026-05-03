import { describe, expect, it } from "vitest";
import { AiCacheService } from "../../../src/ai/ai-cache.service";

describe("AiCacheService", () => {
    it("should store and return cached value", () => {
        process.env.AI_CACHE_TTL_SEC = "300";

        var service = new AiCacheService();
        var key = service.createKey(["summarize", "article-id", 123, "short"]);

        service.set(key, { summary: "Cached summary" });

        expect(service.get<{ summary: string }>(key)).toEqual({
            summary: "Cached summary",
        });

        expect(service.getStats()).toEqual({
            size: 1,
            hits: 1,
            misses: 0,
            hitRatio: 1,
            ttlSeconds: 300,
        });
    });

    it("should return null for missing key and count miss", () => {
        var service = new AiCacheService();

        expect(service.get("missing-key")).toBeNull();
        expect(service.getStats().misses).toBe(1);
    });

    it("should use default ttl when env value is invalid", () => {
        process.env.AI_CACHE_TTL_SEC = "invalid";

        var service = new AiCacheService();

        expect(service.getStats().ttlSeconds).toBe(300);
    });
});