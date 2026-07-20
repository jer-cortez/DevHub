import { prisma } from '../config/prismaClient';
import type { repositories, Prisma } from '../generated/prisma/client';

export const RepositoriesSB = {
  async findAll(): Promise<repositories[]> {
    return prisma.repositories.findMany();
  },
  async findById(id: string): Promise<repositories | null> {
    return prisma.repositories.findUnique({ where: { id } });
  },
  async create(payload: Prisma.repositoriesCreateInput): Promise<repositories> {
    return prisma.repositories.create({ data: payload });
  },
  async delete(id: string): Promise<repositories> {
    return prisma.repositories.delete({ where: { id } });
  },
};
