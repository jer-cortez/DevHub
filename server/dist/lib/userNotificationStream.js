"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addUserClient = addUserClient;
exports.removeUserClient = removeUserClient;
exports.broadcastToUser = broadcastToUser;
const redis_1 = require("./redis");
/**
 * Per-instance registry of connected browsers, keyed by userId.
 *
 * Structurally identical to sse.ts's repo-keyed registry, and for the same
 * reason: this map only knows about connections held open by *this* process,
 * and Redis pub/sub is what makes it correct across multiple instances. The
 * value is a Set because one user can legitimately have several tabs open.
 */
const clients = new Map();
/** Registers a browser's open SSE response so it starts receiving this user's notifications. */
function addUserClient(userId, res) {
    if (!clients.has(userId)) {
        clients.set(userId, new Set());
    }
    clients.get(userId).add(res);
}
/** Unregisters a client (called when the connection closes) and cleans up empty entries. */
function removeUserClient(userId, res) {
    const set = clients.get(userId);
    if (!set)
        return;
    set.delete(res);
    if (set.size === 0) {
        clients.delete(userId);
    }
}
/** Writes an SSE `data:` frame to every tab this user has open on this instance. */
function broadcastToUser(userId, notification) {
    const set = clients.get(userId);
    if (!set)
        return;
    const payload = `data: ${JSON.stringify(notification)}\n\n`;
    for (const res of set) {
        res.write(payload);
    }
}
redis_1.redisSub.subscribe(redis_1.USER_EVENTS_CHANNEL, (err) => {
    if (err) {
        console.error('Failed to subscribe to user events channel:', err);
    }
});
// redisSub is a single connection shared by three subscribers now (sse.ts,
// boardSocket.ts, and this file), and ioredis invokes every registered
// 'message' listener for every channel that connection is subscribed to —
// so each one has to filter for its own channel first, exactly as the other
// two already do.
redis_1.redisSub.on('message', (channel, message) => {
    if (channel !== redis_1.USER_EVENTS_CHANNEL)
        return;
    try {
        const event = JSON.parse(message);
        broadcastToUser(event.userId, event.notification);
    }
    catch (err) {
        console.error('Failed to process user notification message:', err);
    }
});
