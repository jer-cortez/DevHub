"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const notifications_services_1 = require("../services/notifications.services");
exports.NotificationsController = {
    async findAll(_req, res) {
        try {
            const notifications = await notifications_services_1.NotificationsServices.findAll();
            res.status(200).json({ data: notifications });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    },
    async findById(req, res) {
        try {
            const id = req.params.id;
            const notification = await notifications_services_1.NotificationsServices.findById(id);
            res.status(200).json({ data: notification });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch notification' });
        }
    },
    async create(req, res) {
        try {
            const notification = await notifications_services_1.NotificationsServices.create(req.body);
            res.status(201).json({ data: notification });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create notification' });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            await notifications_services_1.NotificationsServices.delete(id);
            res.status(200).json({ message: 'Notification deleted' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete notification' });
        }
    },
};
