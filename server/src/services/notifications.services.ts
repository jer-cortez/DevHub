import { NotificationsSB } from '../supabase/notificationsSB';
import type { notifications, Prisma } from '../generated/prisma/client';

export const NotificationsServices = {
  async findAll(): Promise<notifications[]> {
    return NotificationsSB.findAll();
  },
  async findById(id: string): Promise<notifications> {
    const notification = await NotificationsSB.findById(id);
    if (!notification) throw new Error('Notification not found');
    return notification;
  },
  async create(payload: Prisma.notificationsCreateInput): Promise<notifications> {
    return NotificationsSB.create(payload);
  },
  async delete(id: string): Promise<notifications> {
    return NotificationsSB.delete(id);
  },
};
