"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cached = cached;
exports.invalidateCachePattern = invalidateCachePattern;
const redis_1 = require("./redis");
/**
 * Cache-aside helper: on a cache hit, returns the stored value without
 * calling `fetcher`; on a miss, calls `fetcher`, stores the result with the
 * given TTL, and returns it. This is the main entry point — call sites
 * shouldn't need to touch redisCache directly.
 *
 * Meant for wrapping calls to GitHub's API specifically (see code.services.ts)
 * — those are both slow and subject to GitHub's own rate limits, unlike our
 * own Postgres reads, which are already fast and don't need this.
 */
async function cached(key, ttlSeconds, fetcher) {
    const hit = await redis_1.redisCache.get(key);
    if (hit !== null) {
        return JSON.parse(hit);
    }
    const value = await fetcher();
    await redis_1.redisCache.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return value;
}
/**
 * Deletes every cached key matching `pattern` (e.g. `code:contents:${repoId}:*`).
 * Uses SCAN rather than KEYS — KEYS walks the entire keyspace in one blocking
 * call, which can stall every other Redis client while it runs; SCAN walks
 * it incrementally instead, so it never blocks the server even if the
 * keyspace grows large.
 */
async function invalidateCachePattern(pattern) {
    let cursor = '0';
    do {
        const [nextCursor, keys] = await redis_1.redisCache.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
            await redis_1.redisCache.del(...keys);
        }
    } while (cursor !== '0');
}
