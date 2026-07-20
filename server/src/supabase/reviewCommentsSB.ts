import { prisma } from '../config/prismaClient';
import type { review_comments, Prisma } from '../generated/prisma/client';

export const ReviewCommentsSB = {
  async findAll(): Promise<review_comments[]> {
    return prisma.review_comments.findMany();
  },
  async findById(id: string): Promise<review_comments | null> {
    return prisma.review_comments.findUnique({ where: { id } });
  },
  async create(payload: Prisma.review_commentsCreateInput): Promise<review_comments> {
    return prisma.review_comments.create({ data: payload });
  },
  async delete(id: string): Promise<review_comments> {
    return prisma.review_comments.delete({ where: { id } });
  },
};
