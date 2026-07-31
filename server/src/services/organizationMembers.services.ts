import { OrganizationMembersSB } from '../supabase/organizationMembersSB';
import { OrganizationsServices } from './organizations.services';
import { UserServices } from './users.services';
import { octokit } from '../lib/github';
import type { organization_members, Prisma, User } from '../generated/prisma/client';

const ORG_NAME = process.env.GITHUB_ORG_NAME!;

export interface OrgMemberWithUser {
  id: string;
  joined_at: Date;
  user: User;
}

export const OrganizationMembersServices = {
  async findAll(): Promise<organization_members[]> {
    return OrganizationMembersSB.findAll();
  },
  async findById(id: string): Promise<organization_members> {
    const member = await OrganizationMembersSB.findById(id);
    if (!member) throw new Error('Organization member not found');
    return member;
  },
  async create(payload: Prisma.organization_membersCreateInput): Promise<organization_members> {
    return OrganizationMembersSB.create(payload);
  },
  async delete(id: string): Promise<organization_members> {
    return OrganizationMembersSB.delete(id);
  },
  /**
   * Joins organization_members with their user rows in application code,
   * since this schema has no Prisma @relation attributes anywhere to do a
   * nested query. Used by the People tab, which needs avatars/usernames,
   * not just the bare user_id foreign key.
   */
  async findAllWithUserInfo(): Promise<OrgMemberWithUser[]> {
    const members = await OrganizationMembersSB.findAll();
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
  async syncFromGithub(): Promise<OrgMemberWithUser[]> {
    const { data: githubOrg } = await octokit.rest.orgs.get({ org: ORG_NAME });
    const org = await OrganizationsServices.upsertByGithubOrgId({
      github_org_id: BigInt(githubOrg.id),
      name: githubOrg.login,
      avatar_url: githubOrg.avatar_url,
    });

    const { data: githubMembers } = await octokit.rest.orgs.listMembers({ org: ORG_NAME });

    await Promise.all(
      githubMembers.map(async (member) => {
        const user = await UserServices.upsertByGithubId({
          github_id: member.id,
          username: member.login!,
          avatar_url: member.avatar_url,
        });
        return OrganizationMembersSB.upsertByUserAndOrg({ user_id: user.id, org_id: org.id });
      })
    );

    return this.findAllWithUserInfo();
  },
};
