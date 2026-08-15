"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wss = void 0;
const ws_1 = require("ws");
const auth_services_1 = require("../services/auth.services");
const drawingBoards_services_1 = require("../services/drawingBoards.services");
const redis_1 = require("./redis");
const AUTH_TIMEOUT_MS = 5000;
const SAVE_DEBOUNCE_MS = 2000;
/**
 * Per-instance registry of authenticated connections, keyed by boardId —
 * same role as sse.ts's `clients` map. Only tracks connections held open by
 * this server process; Redis pub/sub (below) is the cross-instance
 * backplane.
 */
const clients = new Map();
/** Per-board debounce timers, so rapid edits don't each trigger a DB write. */
const saveTimers = new Map();
function addClient(boardId, ws) {
    if (!clients.has(boardId)) {
        clients.set(boardId, new Set());
    }
    clients.get(boardId).add(ws);
}
function removeClient(boardId, ws) {
    const set = clients.get(boardId);
    if (!set)
        return;
    set.delete(ws);
    if (set.size === 0) {
        clients.delete(boardId);
    }
}
/** Sends the current nodes/edges to every connection watching `boardId` on this instance. */
function broadcastToBoard(boardId, event) {
    const set = clients.get(boardId);
    if (!set)
        return;
    const payload = JSON.stringify({ type: 'update', nodes: event.nodes, edges: event.edges });
    for (const client of set) {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(payload);
        }
    }
}
/**
 * Resets a per-board timer that persists the latest nodes/edges after
 * SAVE_DEBOUNCE_MS of inactivity, so a burst of edits (e.g. dragging a node)
 * results in one DB write, not one per message.
 */
function scheduleSave(boardId, nodes, edges) {
    const existing = saveTimers.get(boardId);
    if (existing)
        clearTimeout(existing);
    const timer = setTimeout(async () => {
        saveTimers.delete(boardId);
        try {
            await drawingBoards_services_1.DrawingBoardsServices.update(boardId, {
                nodes,
                edges,
            });
        }
        catch (err) {
            console.error(`Failed to persist drawing board ${boardId}:`, err);
        }
    }, SAVE_DEBOUNCE_MS);
    saveTimers.set(boardId, timer);
}
exports.wss = new ws_1.WebSocketServer({ noServer: true });
exports.wss.on('connection', (ws, _req, boardId) => {
    let authenticated = false;
    // A connection that never sends a valid auth message shouldn't stay open
    // indefinitely — this bounds how long an unauthenticated socket can sit
    // around before being dropped.
    const authTimeout = setTimeout(() => {
        if (!authenticated) {
            ws.close(4001, 'Authentication timed out');
        }
    }, AUTH_TIMEOUT_MS);
    ws.on('message', async (raw) => {
        let message;
        try {
            message = JSON.parse(raw.toString());
        }
        catch {
            ws.close(4002, 'Invalid message');
            return;
        }
        if (!authenticated) {
            // First message must be { type: 'auth', token }. Native browser
            // WebSocket can't send an Authorization header (same limitation
            // EventSource had), so auth happens as the first application-level
            // message instead of a token in the connection URL — keeps the
            // token out of server logs/URLs.
            if (message.type !== 'auth' || typeof message.token !== 'string') {
                ws.close(4003, 'Expected auth message');
                return;
            }
            const user = await auth_services_1.AuthHandler.verifySupabaseToken(message.token);
            if (!user) {
                ws.close(4004, 'Invalid or expired token');
                return;
            }
            const isMember = await auth_services_1.AuthHandler.verifyOrgMembership(user.user_metadata.user_name, message.token);
            if (!isMember) {
                ws.close(4005, 'Not an organization member');
                return;
            }
            authenticated = true;
            clearTimeout(authTimeout);
            addClient(boardId, ws);
            try {
                const board = await drawingBoards_services_1.DrawingBoardsServices.findById(boardId);
                ws.send(JSON.stringify({ type: 'sync', nodes: board.nodes, edges: board.edges }));
            }
            catch (err) {
                console.error(`Failed to load board ${boardId} for sync:`, err);
                ws.close(4006, 'Board not found');
            }
            return;
        }
        if (message.type === 'update') {
            // Persisting happens once, here, at the instance that actually
            // received this client's raw message — not inside the Redis message
            // handler below, which fires on every instance and would otherwise
            // cause duplicate writes of the same data if it scheduled saves too.
            scheduleSave(boardId, message.nodes, message.edges);
            // Delivery to connected browsers — including ones on this same
            // instance — happens uniformly through Redis, mirroring sse.ts:
            // there's exactly one path from "an update happened" to "connected
            // clients see it," rather than a local-broadcast special case plus
            // a separate cross-instance path. The sender's own client receiving
            // its own update back is harmless (React Flow just re-applies the
            // same nodes/edges it already has).
            await redis_1.redisPub.publish(redis_1.BOARD_EVENTS_CHANNEL, JSON.stringify({ boardId, nodes: message.nodes, edges: message.edges }));
        }
    });
    ws.on('close', () => {
        clearTimeout(authTimeout);
        removeClient(boardId, ws);
    });
});
redis_1.redisSub.subscribe(redis_1.BOARD_EVENTS_CHANNEL, (err) => {
    if (err) {
        console.error('Failed to subscribe to board events channel:', err);
    }
});
// redisSub is shared with sse.ts (subscribed to REPO_EVENTS_CHANNEL on the
// same client) — every 'message' listener fires for every channel that
// client is subscribed to, so this has to ignore messages meant for that
// other channel.
redis_1.redisSub.on('message', (channel, message) => {
    if (channel !== redis_1.BOARD_EVENTS_CHANNEL)
        return;
    try {
        const event = JSON.parse(message);
        broadcastToBoard(event.boardId, event);
    }
    catch (err) {
        console.error('Failed to process board pub/sub message:', err);
    }
});
