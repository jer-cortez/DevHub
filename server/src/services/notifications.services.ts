import { NotificationsSB } from '../supabase/notificationsSB';
import type { notifications } from '../generated/prisma/client';

/**
 * Every method here takes a userId and scopes to it. There is intentionally
 * no `findAll` / `findById` / `create` — notifications are written only by
 * the fan-out engine (services/notificationFanout.ts) in response to real
 * events, never by a client request, and they're only ever read by their
 * own recipient.
 */
export const NotificationsServices = {
  async findForUser(userId: string, limit?: number): Promise<notifications[]> {
    return NotificationsSB.findByUserId(userId, limit);
  },
  async countUnread(userId: string): Promise<number> {
    return NotificationsSB.countUnread(userId);
  },
  /** Returns false when the notification doesn't exist *or* belongs to someone else — the caller can't distinguish the two, which is deliberate. */
  async markRead(id: string, userId: string): Promise<boolean> {
    const count = await NotificationsSB.markRead(id, userId);
    return count > 0;
  },
  async markAllRead(userId: string): Promise<number> {
    return NotificationsSB.markAllRead(userId);
  },
};
