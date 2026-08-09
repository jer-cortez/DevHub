import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL!;

/**
 * The single pub/sub channel used to broadcast repo events (PR updates,
 * new comments) between server instances. All instances publish to and
 * subscribe on this same channel; events are filtered by `repoId` after
 * receipt, not by using a separate channel per repo.
 */
export const REPO_EVENTS_CHANNEL = 'repo-events';

/** Broadcasts live drawing-board edits (nodes/edges updates) between server instances, same role as REPO_EVENTS_CHANNEL but for the whiteboard feature. */
export const BOARD_EVENTS_CHANNEL = 'board-events';

/**
 * Two separate Redis connections, not one shared client:
 * once a connection issues SUBSCRIBE, ioredis (like Redis itself) puts it
 * into subscriber mode, where it can no longer run normal commands like
 * PUBLISH. `redisPub` is used only to publish events (from the webhook
 * handler); `redisSub` is used only to subscribe (from sse.ts).
 */
export const redisPub = new Redis(REDIS_URL);
export const redisSub = new Redis(REDIS_URL);

/**
 * A third, separate connection dedicated to caching (GET/SET/DEL/SCAN),
 * kept distinct from redisPub/redisSub — those two are conceptually
 * "pub/sub only," and mixing cache traffic into either would blur that.
 * ioredis connections are cheap, so a dedicated one for a different
 * responsibility is simpler to reason about than one client doing three
 * jobs.
 */
export const redisCache = new Redis(REDIS_URL);
