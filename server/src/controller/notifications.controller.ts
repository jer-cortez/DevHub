import type { Request, Response } from 'express';
import { NotificationsServices } from '../services/notifications.services';
import { resolveLocalUser } from '../services/currentUser.services';
import { addUserClient, removeUserClient } from '../lib/userNotificationStream';

const HEARTBEAT_INTERVAL_MS = 30_000;

export const NotificationsController = {
  /** The authenticated user's own notifications, newest first, plus their unread count for the bell badge. */
  async findMine(req: Request, res: Response) {
    try {
      const user = await resolveLocalUser(req);
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      const [notifications, unreadCount] = await Promise.all([
        NotificationsServices.findForUser(user.id, limit),
        NotificationsServices.countUnread(user.id),
      ]);

      res.status(200).json({ data: { notifications, unreadCount } });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  },
  async markRead(req: Request, res: Response) {
    try {
      const user = await resolveLocalUser(req);
      const updated = await NotificationsServices.markRead(req.params.id as string, user.id);

      // 404 rather than 403 when the row belongs to someone else — telling
      // the caller "that exists but isn't yours" would confirm the id.
      if (!updated) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }
      res.status(200).json({ data: { id: req.params.id } });
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark notification read' });
    }
  },
  async markAllRead(req: Request, res: Response) {
    try {
      const user = await resolveLocalUser(req);
      const count = await NotificationsServices.markAllRead(user.id);
      res.status(200).json({ data: { count } });
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark notifications read' });
    }
  },
  /**
   * Long-lived SSE connection carrying this user's notifications, from
   * anywhere in the app. This is the user-scoped counterpart to
   * EventsController.subscribe, which is scoped to a single repo and only
   * delivers while that repo's page is open.
   */
  async subscribe(req: Request, res: Response) {
    const user = await resolveLocalUser(req);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.flushHeaders();

    addUserClient(user.id, res);

    // Same reasoning as the repo event stream: idle connections get dropped
    // by proxies, so a periodic comment frame keeps them alive.
    const heartbeat = setInterval(() => {
      res.write(':heartbeat\n\n');
    }, HEARTBEAT_INTERVAL_MS);

    req.on('close', () => {
      clearInterval(heartbeat);
      removeUserClient(user.id, res);
    });
  },
};
