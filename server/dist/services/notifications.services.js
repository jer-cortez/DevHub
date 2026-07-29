"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsServices = void 0;
const notificationsSB_1 = require("../supabase/notificationsSB");
exports.NotificationsServices = {
    async findAll() {
        return notificationsSB_1.NotificationsSB.findAll();
    },
    async findById(id) {
        const notification = await notificationsSB_1.NotificationsSB.findById(id);
        if (!notification)
            throw new Error('Notification not found');
        return notification;
    },
    async create(payload) {
        return notificationsSB_1.NotificationsSB.create(payload);
    },
    async delete(id) {
        return notificationsSB_1.NotificationsSB.delete(id);
    },
};
