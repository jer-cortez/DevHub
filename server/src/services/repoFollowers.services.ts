import { RepoFollowersSB, type FollowPreferences } from '../supabase/repoFollowersSB';
import type { repo_followers } from '../generated/prisma/client';

export type { FollowPreferences };

/**
 * Following is the lighter-weight counterpart to team membership: you don't
 * work on the repo, you just want a filtered view of what's happening there.
 * Unlike team membership, following is not exclusive — you can follow any
 * number of repos.
 */
export const RepoFollowersServices = {
  async findForUser(userId: string): Promise<repo_followers[]> {
    return RepoFollowersSB.findByUserId(userId);
  },
  async findOne(userId: string, repoId: string): Promise<repo_followers | null> {
    return RepoFollowersSB.findOne(userId, repoId);
  },
  async follow(
    userId: string,
    repoId: string,
    preferences?: Partial<FollowPreferences>
  ): Promise<repo_followers> {
    return RepoFollowersSB.follow(userId, repoId, preferences);
  },
  async updatePreferences(
    userId: string,
    repoId: string,
    preferences: Partial<FollowPreferences>
  ): Promise<repo_followers> {
    return RepoFollowersSB.updatePreferences(userId, repoId, preferences);
  },
  async unfollow(userId: string, repoId: string): Promise<void> {
    return RepoFollowersSB.unfollow(userId, repoId);
  },
};
