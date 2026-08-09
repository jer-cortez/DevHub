import { prisma } from '../config/prismaClient';
import type { notifications, Prisma } from '../generated/prisma/client';

export const NotificationsSB = {
  /**
   * Every read here is scoped by user_id, deliberately — there is no
   * "fetch all notifications" method. Notifications carry PR titles and
   * comment context, so an unscoped read is a cross-user data leak; the
   * previous bare-CRUD `findAll` was exactly that and has been removed.
   */
  async findByUserId(userId: string, limit = 50): Promise<notifications[]> {
    return prisma.notifications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  },
  async countUnread(userId: string): Promise<number> {
    return prisma.notifications.count({ where: { user_id: userId, is_read: false } });
  },
  /**
   * `createManyAndReturn` rather than `createMany` because the created rows
   * (with their generated ids) are immediately published to the SSE stream —
   * plain createMany returns only a count on Postgres.
   */
  async createMany(rows: Prisma.notificationsCreateManyInput[]): Promise<notifications[]> {
    if (rows.length === 0) return [];
    return prisma.notifications.createManyAndReturn({ data: rows });
  },
  /** Scoped by user_id as well as id, so one user can't mark another's notification read by guessing a uuid. */
  async markRead(id: string, userId: string): Promise<number> {
    const { count } = await prisma.notifications.updateMany({
      where: { id, user_id: userId },
      data: { is_read: true },
    });
    return count;
  },
  async markAllRead(userId: string): Promise<number> {
    const { count } = await prisma.notifications.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });
    return count;
  },
};
