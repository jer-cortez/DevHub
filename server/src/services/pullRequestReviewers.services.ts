import { PullRequestReviewersSB } from '../supabase/pullRequestReviewersSB';
import type { pull_request_reviewers, Prisma } from '../generated/prisma/client';

export const PullRequestReviewersServices = {
  async findAll(): Promise<pull_request_reviewers[]> {
    return PullRequestReviewersSB.findAll();
  },
  async findById(id: string): Promise<pull_request_reviewers> {
    const reviewer = await PullRequestReviewersSB.findById(id);
    if (!reviewer) throw new Error('Pull request reviewer not found');
    return reviewer;
  },
  async create(payload: Prisma.pull_request_reviewersCreateInput): Promise<pull_request_reviewers> {
    return PullRequestReviewersSB.create(payload);
  },
  async delete(id: string): Promise<pull_request_reviewers> {
    return PullRequestReviewersSB.delete(id);
  },
};
