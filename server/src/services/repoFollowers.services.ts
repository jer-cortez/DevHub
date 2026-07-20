import { RepoFollowersSB } from '../supabase/repoFollowersSB';
import type { repo_followers, Prisma } from '../generated/prisma/client';

export const RepoFollowersServices = {
  async findAll(): Promise<repo_followers[]> {
    return RepoFollowersSB.findAll();
  },
  async findById(id: bigint): Promise<repo_followers> {
    const follower = await RepoFollowersSB.findById(id);
    if (!follower) throw new Error('Repo follower not found');
    return follower;
  },
  async create(payload: Prisma.repo_followersCreateInput): Promise<repo_followers> {
    return RepoFollowersSB.create(payload);
  },
  async delete(id: bigint): Promise<repo_followers> {
    return RepoFollowersSB.delete(id);
  },
};
