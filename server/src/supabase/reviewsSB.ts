import { prisma } from '../config/prismaClient';
import type { reviews, Prisma } from '../generated/prisma/client';

export const ReviewsSB = {
  async findAll(): Promise<reviews[]> {
    return prisma.reviews.findMany();
  },
  async findById(id: string): Promise<reviews | null> {
    return prisma.reviews.findUnique({ where: { id } });
  },
  async create(payload: Prisma.reviewsCreateInput): Promise<reviews> {
    return prisma.reviews.create({ data: payload });
  },
  async delete(id: string): Promise<reviews> {
    return prisma.reviews.delete({ where: { id } });
  },
};
