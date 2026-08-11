"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisCache = exports.redisSub = exports.redisPub = exports.USER_EVENTS_CHANNEL = exports.BOARD_EVENTS_CHANNEL = exports.REPO_EVENTS_CHANNEL = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const REDIS_URL = process.env.REDIS_URL;
/**
 * The single pub/sub channel used to broadcast repo events (PR updates,
 * new comments) between server instances. All instances publish to and
 * subscribe on this same channel; events are filtered by `repoId` after
 * receipt, not by using a separate channel per repo.
 */
exports.REPO_EVENTS_CHANNEL = 'repo-events';
/** Broadcasts live drawing-board edits (nodes/edges updates) between server instances, same role as REPO_EVENTS_CHANNEL but for the whiteboard feature. */
exports.BOARD_EVENTS_CHANNEL = 'board-events';
/**
 * Carries personalized notifications, addressed to a single user rather than
 * to everyone watching a repo. REPO_EVENTS_CHANNEL answers "what happened in
 * this repo" (and is only delivered while you have that repo's page open);
 * this one answers "what happened that concerns *me*", across every repo the
 * user is on a team for or follows, and is delivered anywhere in the app.
 */
exports.USER_EVENTS_CHANNEL = 'user-events';
/**
 * Two separate Redis connections, not one shared client:
 * once a connection issues SUBSCRIBE, ioredis (like Redis itself) puts it
 * into subscriber mode, where it can no longer run normal commands like
 * PUBLISH. `redisPub` is used only to publish events (from the webhook
 * handler); `redisSub` is used only to subscribe (from sse.ts).
 */
exports.redisPub = new ioredis_1.default(REDIS_URL);
exports.redisSub = new ioredis_1.default(REDIS_URL);
/**
 * A third, separate connection dedicated to caching (GET/SET/DEL/SCAN),
 * kept distinct from redisPub/redisSub — those two are conceptually
 * "pub/sub only," and mixing cache traffic into either would blur that.
 * ioredis connections are cheap, so a dedicated one for a different
 * responsibility is simpler to reason about than one client doing three
 * jobs.
 */
exports.redisCache = new ioredis_1.default(REDIS_URL);
