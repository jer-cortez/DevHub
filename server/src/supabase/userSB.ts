import { prisma } from '../config/prismaClient';
import type { User, Prisma } from '../generated/prisma/client';

export const UserSB = {
  async findAll(): Promise<User[]> {
    return prisma.user.findMany();
  },
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },
  async createUser(payload: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data: payload });
  },
  async delete(id: string): Promise<User> {
    return prisma.user.delete({ where: { id } });
  },
};
