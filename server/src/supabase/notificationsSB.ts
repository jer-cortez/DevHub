import { prisma } from '../config/prismaClient';
import type { notifications, Prisma } from '../generated/prisma/client';

export const NotificationsSB = {
  async findAll(): Promise<notifications[]> {
    return prisma.notifications.findMany();
  },
  async findById(id: string): Promise<notifications | null> {
    return prisma.notifications.findUnique({ where: { id } });
  },
  async create(payload: Prisma.notificationsCreateInput): Promise<notifications> {
    return prisma.notifications.create({ data: payload });
  },
  async delete(id: string): Promise<notifications> {
    return prisma.notifications.delete({ where: { id } });
  },
};
