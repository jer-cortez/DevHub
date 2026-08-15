"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORG_EVENTS_KEY = void 0;
exports.addClient = addClient;
exports.removeClient = removeClient;
exports.broadcastToRepo = broadcastToRepo;
const redis_1 = require("./redis");
/**
 * Sentinel `repoId` for events that concern the whole org rather than one
 * repo — currently just `repository` events (a repo being added, renamed,
 * archived, or removed), which the org-wide Repositories list needs to hear
 * about even though it isn't scoped to any single repo. Reuses the same
 * per-repo client registry and Redis channel below rather than standing up
 * a second, near-identical pub/sub path — nothing here actually requires
 * the key to be a real repo id, it's just a routing key. Safe to use a
 * short literal: real repoIds are UUIDs, so this can never collide with one.
 */
exports.ORG_EVENTS_KEY = 'org';
/**
 * Per-instance registry of locally-connected SSE clients, keyed by repoId.
 *
 * This only tracks connections held open by *this* server process. Redis
 * pub/sub (see below) is what makes this work across multiple instances:
 * every instance subscribes to the same channel and independently fans out
 * to whichever local clients are in its own `clients` map, regardless of
 * which instance actually received the webhook that triggered the event.
 * That keeps the fan-out logic identical in both the single-instance and
 * multi-instance case — there's exactly one code path (the Redis message
 * handler below), not a special case for "this instance produced the event."
 */
const clients = new Map();
/** Registers a browser's open SSE response so it starts receiving events for `repoId`. */
function addClient(repoId, res) {
    if (!clients.has(repoId)) {
        clients.set(repoId, new Set());
    }
    clients.get(repoId).add(res);
}
/** Unregisters a client (called when the connection closes) and cleans up empty entries. */
function removeClient(repoId, res) {
    const set = clients.get(repoId);
    if (!set)
        return;
    set.delete(res);
    if (set.size === 0) {
        clients.delete(repoId);
    }
}
/** Writes an SSE `data:` frame to every client currently watching `repoId` on this instance. */
function broadcastToRepo(repoId, event) {
    const set = clients.get(repoId);
    if (!set)
        return;
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of set) {
        res.write(payload);
    }
}
// Subscribe once, at module load, for the lifetime of the process.
redis_1.redisSub.subscribe(redis_1.REPO_EVENTS_CHANNEL, (err) => {
    if (err) {
        console.error('Failed to subscribe to Redis channel:', err);
    }
});
// This fires whenever ANY instance publishes to REPO_EVENTS_CHANNEL,
// including this one — the webhook handler never writes to SSE clients
// directly, it only publishes to Redis, so this is the single place
// events actually reach connected browsers.
//
// redisSub is shared with boardSocket.ts (subscribed to a different
// channel for the drawing-board feature), and ioredis fires every
// registered 'message' listener for every channel that client is
// subscribed to — so this has to ignore messages meant for that channel.
redis_1.redisSub.on('message', (channel, message) => {
    if (channel !== redis_1.REPO_EVENTS_CHANNEL)
        return;
    try {
        const event = JSON.parse(message);
        broadcastToRepo(event.repoId, event);
    }
    catch (err) {
        console.error('Failed to process Redis pub/sub message:', err);
    }
});
