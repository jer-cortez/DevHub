import { prisma } from '../config/prismaClient';
import type { pull_request_reviewers, Prisma } from '../generated/prisma/client';

export const PullRequestReviewersSB = {
  async findAll(): Promise<pull_request_reviewers[]> {
    return prisma.pull_request_reviewers.findMany();
  },
  async findById(id: string): Promise<pull_request_reviewers | null> {
    return prisma.pull_request_reviewers.findUnique({ where: { id } });
  },
  async create(payload: Prisma.pull_request_reviewersCreateInput): Promise<pull_request_reviewers> {
    return prisma.pull_request_reviewers.create({ data: payload });
  },
  async delete(id: string): Promise<pull_request_reviewers> {
    return prisma.pull_request_reviewers.delete({ where: { id } });
  },
  /** Everyone asked to review a PR — used by notification fan-out to decide who an event *directly* concerns, not just who's nearby. */
  async findByPrId(prId: string): Promise<pull_request_reviewers[]> {
    return prisma.pull_request_reviewers.findMany({ where: { pr_id: prId } });
  },
};
