import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL!;

/**
 * The single pub/sub channel used to broadcast repo events (PR updates,
 * new comments) between server instances. All instances publish to and
 * subscribe on this same channel; events are filtered by `repoId` after
 * receipt, not by using a separate channel per repo.
 */
export const REPO_EVENTS_CHANNEL = 'repo-events';

/**
 * Two separate Redis connections, not one shared client:
 * once a connection issues SUBSCRIBE, ioredis (like Redis itself) puts it
 * into subscriber mode, where it can no longer run normal commands like
 * PUBLISH. `redisPub` is used only to publish events (from the webhook
 * handler); `redisSub` is used only to subscribe (from sse.ts).
 */
export const redisPub = new Redis(REDIS_URL);
export const redisSub = new Redis(REDIS_URL);
