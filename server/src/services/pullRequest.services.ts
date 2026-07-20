import { PullRequestSB } from '../supabase/pullRequestSB';
import type { pull_request, Prisma } from '../generated/prisma/client';

export const PullRequestServices = {
  async findAll(): Promise<pull_request[]> {
    return PullRequestSB.findAll();
  },
  async findById(id: string): Promise<pull_request> {
    const pr = await PullRequestSB.findById(id);
    if (!pr) throw new Error('Pull request not found');
    return pr;
  },
  async create(payload: Prisma.pull_requestCreateInput): Promise<pull_request> {
    const pr = await PullRequestSB.create(payload);
    if (!pr) throw new Error('Could not create pull request');
    return pr;
  },
  async delete(id: string): Promise<pull_request> {
    return PullRequestSB.delete(id);
  },
};
