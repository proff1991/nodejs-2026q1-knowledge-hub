import { Injectable } from "@nestjs/common";

type CacheEntry<T> = {
    value: T;
    expiresAt: number;
};

@Injectable()
export class AiCacheService {
    private readonly cache = new Map<string, CacheEntry<unknown>>();
    private hits = 0;
    private misses = 0;

    get<T>(key: string): T | null {
        var entry = this.cache.get(key);

        if (!entry) {
            this.misses++;

            return null;
        }

        if (entry.expiresAt <= Date.now()) {
            this.cache.delete(key);
            this.misses++;

            return null;
        }

        this.hits++;

        return entry.value as T;
    }

    set<T>(key: string, value: T): void {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + this.getTtlMs(),
        });
    }

    createKey(parts: unknown[]): string {
        return JSON.stringify(parts);
    }

    getStats() {
        var total = this.hits + this.misses;

        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRatio: total === 0 ? 0 : this.hits / total,
            ttlSeconds: this.getTtlSeconds(),
        };
    }

    private getTtlMs(): number {
        return this.getTtlSeconds() * 1000;
    }

    private getTtlSeconds(): number {
        var ttl = Number(process.env.AI_CACHE_TTL_SEC ?? 300);

        if (!Number.isFinite(ttl) || ttl <= 0) {
            return 300;
        }

        return ttl;
    }
}