"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsServices = void 0;
const notificationsSB_1 = require("../supabase/notificationsSB");
/**
 * Every method here takes a userId and scopes to it. There is intentionally
 * no `findAll` / `findById` / `create` — notifications are written only by
 * the fan-out engine (services/notificationFanout.ts) in response to real
 * events, never by a client request, and they're only ever read by their
 * own recipient.
 */
exports.NotificationsServices = {
    async findForUser(userId, limit) {
        return notificationsSB_1.NotificationsSB.findByUserId(userId, limit);
    },
    async countUnread(userId) {
        return notificationsSB_1.NotificationsSB.countUnread(userId);
    },
    /** Returns false when the notification doesn't exist *or* belongs to someone else — the caller can't distinguish the two, which is deliberate. */
    async markRead(id, userId) {
        const count = await notificationsSB_1.NotificationsSB.markRead(id, userId);
        return count > 0;
    },
    async markAllRead(userId) {
        return notificationsSB_1.NotificationsSB.markAllRead(userId);
    },
};
