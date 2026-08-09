import { prisma } from '../config/prismaClient';
import type { repo_followers } from '../generated/prisma/client';

/** Which event types a follower wants delivered. Team members bypass this entirely — they get everything for their own repo. */
export interface FollowPreferences {
  notify_pull_requests: boolean;
  notify_issues: boolean;
  notify_comments: boolean;
}

export const RepoFollowersSB = {
  async findByUserId(userId: string): Promise<repo_followers[]> {
    return prisma.repo_followers.findMany({ where: { user_id: userId } });
  },
  async findByRepoId(repoId: string): Promise<repo_followers[]> {
    return prisma.repo_followers.findMany({ where: { repo_id: repoId } });
  },
  async findOne(userId: string, repoId: string): Promise<repo_followers | null> {
    return prisma.repo_followers.findUnique({
      where: { user_id_repo_id: { user_id: userId, repo_id: repoId } },
    });
  },
  /**
   * Followers of a repo who have opted into one specific event type. The
   * preference column is chosen by the caller rather than passed as a
   * string, so a typo can't silently match zero rows.
   */
  async findSubscribedToRepo(
    repoId: string,
    preference: keyof FollowPreferences
  ): Promise<repo_followers[]> {
    return prisma.repo_followers.findMany({
      where: { repo_id: repoId, [preference]: true },
    });
  },
  /** Following is an upsert on (user_id, repo_id) so re-following doesn't create a duplicate row, and re-following with new preferences updates them. */
  async follow(
    userId: string,
    repoId: string,
    preferences: Partial<FollowPreferences> = {}
  ): Promise<repo_followers> {
    return prisma.repo_followers.upsert({
      where: { user_id_repo_id: { user_id: userId, repo_id: repoId } },
      update: preferences,
      create: { user_id: userId, repo_id: repoId, ...preferences },
    });
  },
  async updatePreferences(
    userId: string,
    repoId: string,
    preferences: Partial<FollowPreferences>
  ): Promise<repo_followers> {
    return prisma.repo_followers.update({
      where: { user_id_repo_id: { user_id: userId, repo_id: repoId } },
      data: preferences,
    });
  },
  /** Idempotent, same reasoning as leaving a team. */
  async unfollow(userId: string, repoId: string): Promise<void> {
    await prisma.repo_followers.deleteMany({ where: { user_id: userId, repo_id: repoId } });
  },
};
