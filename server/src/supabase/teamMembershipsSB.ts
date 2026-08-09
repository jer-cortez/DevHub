import { prisma } from '../config/prismaClient';
import type { team_memberships } from '../generated/prisma/client';

export const TeamMembershipsSB = {
  /** The one repo this user is currently working on, or null if they haven't joined a team. */
  async findByUserId(userId: string): Promise<team_memberships | null> {
    return prisma.team_memberships.findUnique({ where: { user_id: userId } });
  },
  /** Everyone currently working on a repo — the repo's "team". Also the primary recipient set for notification fan-out. */
  async findByRepoId(repoId: string): Promise<team_memberships[]> {
    return prisma.team_memberships.findMany({ where: { repo_id: repoId } });
  },
  /**
   * Joining a team is an upsert on user_id rather than an insert, because
   * membership is exclusive — the unique constraint is on user_id alone, so
   * switching projects overwrites the old row instead of accumulating one
   * per repo the user has ever worked on.
   */
  async join(userId: string, repoId: string): Promise<team_memberships> {
    return prisma.team_memberships.upsert({
      where: { user_id: userId },
      update: { repo_id: repoId, joined_at: new Date() },
      create: { user_id: userId, repo_id: repoId },
    });
  },
  /** Leaving is idempotent — deleting a membership that isn't there is a no-op, not an error. */
  async leave(userId: string): Promise<void> {
    await prisma.team_memberships.deleteMany({ where: { user_id: userId } });
  },
};
