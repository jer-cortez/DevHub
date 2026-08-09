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
  async findByPrId(prId: string): Promise<reviews[]> {
    return prisma.reviews.findMany({ where: { pr_id: prId }, orderBy: { submitted_at: 'desc' } });
  },
  /** Keyed on GitHub's globally-unique review id, so re-syncing is a no-op rather than a duplicate. */
  async upsertByGithubReviewId(data: {
    github_review_id: bigint;
    pr_id: string;
    reviewer_id: string;
    decision: string;
    body?: string | null;
    submitted_at: Date;
  }): Promise<reviews> {
    return prisma.reviews.upsert({
      where: { github_review_id: data.github_review_id },
      update: data,
      create: data,
    });
  },
};
