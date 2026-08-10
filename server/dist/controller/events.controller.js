"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsController = void 0;
const sse_1 = require("../lib/sse");
const HEARTBEAT_INTERVAL_MS = 30000;
exports.EventsController = {
    /**
     * Opens a long-lived SSE connection for one repo. The browser keeps this
     * request open indefinitely (via @microsoft/fetch-event-source on the
     * client) and receives a `data:` frame every time sse.ts broadcasts an
     * event for this repoId.
     */
    async subscribe(req, res) {
        const repoId = req.params.repoId;
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });
        // Flush headers immediately so the client's connection opens right away,
        // rather than waiting for the first real event to arrive.
        res.flushHeaders();
        (0, sse_1.addClient)(repoId, res);
        // Idle connections can be silently dropped by proxies/load balancers
        // after a timeout. A periodic comment frame (ignored by the client,
        // since it has no `data:` prefix) keeps the connection alive and lets
        // us detect a dead connection quickly via the write failing.
        const heartbeat = setInterval(() => {
            res.write(':heartbeat\n\n');
        }, HEARTBEAT_INTERVAL_MS);
        req.on('close', () => {
            clearInterval(heartbeat);
            (0, sse_1.removeClient)(repoId, res);
        });
    },
};
