import { TeamMembershipsSB } from '../supabase/teamMembershipsSB';
import { UserServices } from './users.services';
import type { team_memberships, User } from '../generated/prisma/client';

export interface TeamMemberWithUser {
  id: string;
  joined_at: Date;
  user: User;
}

/**
 * A "team" here is just the set of people currently working on a repo —
 * there's no separate team entity. Joining a team is how a user tells the
 * server which project they're on, which is what makes personalized
 * notification fan-out possible.
 *
 * Membership is exclusive: one repo at a time, so moving to a new project
 * is a single join call rather than a leave-then-join pair.
 */
export const TeamsServices = {
  async findForUser(userId: string): Promise<team_memberships | null> {
    return TeamMembershipsSB.findByUserId(userId);
  },
  /**
   * Joins the repo's members to their user rows in application code, since
   * this schema has no Prisma @relation attributes to do it in one query —
   * the same approach as OrganizationMembersServices.findAllWithUserInfo.
   */
  async findTeamForRepo(repoId: string): Promise<TeamMemberWithUser[]> {
    const members = await TeamMembershipsSB.findByRepoId(repoId);
    if (members.length === 0) return [];

    const users = await UserServices.findByIds(members.map((m) => m.user_id));
    const usersById = new Map(users.map((u) => [u.id, u]));

    return members
      .filter((m) => usersById.has(m.user_id))
      .map((m) => ({
        id: m.id,
        joined_at: m.joined_at,
        user: usersById.get(m.user_id)!,
      }));
  },
  async join(userId: string, repoId: string): Promise<team_memberships> {
    return TeamMembershipsSB.join(userId, repoId);
  },
  async leave(userId: string): Promise<void> {
    return TeamMembershipsSB.leave(userId);
  },
};
