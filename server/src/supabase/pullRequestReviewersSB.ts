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
  /**
   * A person is requested on a PR at most once, so (pr_id, user_id) is the
   * natural key. `assigned_at` is only set on insert — re-syncing must not
   * reset how long someone has been sitting on a request, which is exactly
   * the number the health dashboard reports.
   */
  async upsertByPrAndUser(data: {
    pr_id: string;
    user_id: string;
    status: string;
    assigned_at: Date;
    reviewed_at?: Date | null;
  }): Promise<pull_request_reviewers> {
    const { assigned_at, ...mutable } = data;
    return prisma.pull_request_reviewers.upsert({
      where: { pr_id_user_id: { pr_id: data.pr_id, user_id: data.user_id } },
      update: mutable,
      create: data,
    });
  },
  /**
   * Clears requests that GitHub no longer reports — a review was submitted or
   * the request was withdrawn. Without this, someone's pending count would
   * only ever grow.
   */
  async deleteStaleForPr(prId: string, keepUserIds: string[]): Promise<number> {
    const { count } = await prisma.pull_request_reviewers.deleteMany({
      where: { pr_id: prId, status: 'pending', user_id: { notIn: keepUserIds } },
    });
    return count;
  },
};
