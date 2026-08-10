"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const notifications_services_1 = require("../services/notifications.services");
const currentUser_services_1 = require("../services/currentUser.services");
const userNotificationStream_1 = require("../lib/userNotificationStream");
const HEARTBEAT_INTERVAL_MS = 30000;
exports.NotificationsController = {
    /** The authenticated user's own notifications, newest first, plus their unread count for the bell badge. */
    async findMine(req, res) {
        try {
            const user = await (0, currentUser_services_1.resolveLocalUser)(req);
            const limit = req.query.limit ? Number(req.query.limit) : undefined;
            const [notifications, unreadCount] = await Promise.all([
                notifications_services_1.NotificationsServices.findForUser(user.id, limit),
                notifications_services_1.NotificationsServices.countUnread(user.id),
            ]);
            res.status(200).json({ data: { notifications, unreadCount } });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    },
    async markRead(req, res) {
        try {
            const user = await (0, currentUser_services_1.resolveLocalUser)(req);
            const updated = await notifications_services_1.NotificationsServices.markRead(req.params.id, user.id);
            // 404 rather than 403 when the row belongs to someone else — telling
            // the caller "that exists but isn't yours" would confirm the id.
            if (!updated) {
                res.status(404).json({ error: 'Notification not found' });
                return;
            }
            res.status(200).json({ data: { id: req.params.id } });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to mark notification read' });
        }
    },
    async markAllRead(req, res) {
        try {
            const user = await (0, currentUser_services_1.resolveLocalUser)(req);
            const count = await notifications_services_1.NotificationsServices.markAllRead(user.id);
            res.status(200).json({ data: { count } });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to mark notifications read' });
        }
    },
    /**
     * Long-lived SSE connection carrying this user's notifications, from
     * anywhere in the app. This is the user-scoped counterpart to
     * EventsController.subscribe, which is scoped to a single repo and only
     * delivers while that repo's page is open.
     */
    async subscribe(req, res) {
        const user = await (0, currentUser_services_1.resolveLocalUser)(req);
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });
        res.flushHeaders();
        (0, userNotificationStream_1.addUserClient)(user.id, res);
        // Same reasoning as the repo event stream: idle connections get dropped
        // by proxies, so a periodic comment frame keeps them alive.
        const heartbeat = setInterval(() => {
            res.write(':heartbeat\n\n');
        }, HEARTBEAT_INTERVAL_MS);
        req.on('close', () => {
            clearInterval(heartbeat);
            (0, userNotificationStream_1.removeUserClient)(user.id, res);
        });
    },
};
