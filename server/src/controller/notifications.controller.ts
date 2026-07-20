import type { Request, Response } from 'express';
import { NotificationsServices } from '../services/notifications.services';

export const NotificationsController = {
  async findAll(_req: Request, res: Response) {
    try {
      const notifications = await NotificationsServices.findAll();
      res.status(200).json({ data: notifications });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  },
  async findById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const notification = await NotificationsServices.findById(id);
      res.status(200).json({ data: notification });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notification' });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const notification = await NotificationsServices.create(req.body);
      res.status(201).json({ data: notification });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create notification' });
    }
  },
  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await NotificationsServices.delete(id);
      res.status(200).json({ message: 'Notification deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  },
};
