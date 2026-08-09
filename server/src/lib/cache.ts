import { redisCache } from './redis';

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
export async function cached<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = await redisCache.get(key);
  if (hit !== null) {
    return JSON.parse(hit) as T;
  }

  const value = await fetcher();
  await redisCache.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  return value;
}

/**
 * Deletes every cached key matching `pattern` (e.g. `code:contents:${repoId}:*`).
 * Uses SCAN rather than KEYS — KEYS walks the entire keyspace in one blocking
 * call, which can stall every other Redis client while it runs; SCAN walks
 * it incrementally instead, so it never blocks the server even if the
 * keyspace grows large.
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redisCache.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redisCache.del(...keys);
    }
  } while (cursor !== '0');
}
