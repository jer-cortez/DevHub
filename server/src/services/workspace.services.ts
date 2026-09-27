import { prisma } from '../config/prismaClient';
import { isOrganizationRole, isTeamRole, workspacePermissions, type WorkspaceActor } from './workspacePolicy';

export class WorkspaceError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const WorkspaceServices = {
  async actorForUser(userId: string): Promise<WorkspaceActor> {
    const organizationName = process.env.GITHUB_ORG_NAME;
    if (!organizationName) throw new WorkspaceError(503, 'Workspace organization is not configured');
    const organizations = await prisma.organizations.findMany({
      where: { name: { equals: organizationName, mode: 'insensitive' } },
      select: { id: true }, take: 2,
    });
    if (organizations.length !== 1) {
      throw new WorkspaceError(503, 'Sync and configure a single workspace organization first');
    }
    const organizationId = organizations[0].id;
    const [membership, team] = await Promise.all([
      prisma.organization_members.findUnique({ where: { user_id_org_id: { user_id: userId, org_id: organizationId } } }),
      prisma.team_memberships.findUnique({ where: { user_id: userId } }),
    ]);
    const role = membership && isOrganizationRole(membership.role) ? membership.role : null;
    const active = membership?.status === 'active' && role !== null;
    // A stale/foreign-org team row must never grant project privileges.
    const repo = team && active && isTeamRole(team.role)
      ? await prisma.repositories.findFirst({ where: { id: team.repo_id, org_id: organizationId }, select: { id: true } })
      : null;
    return {
      userId, organizationId, organizationRole: role, active,
      team: team && repo && isTeamRole(team.role) ? { repoId: repo.id, role: team.role } : null,
    };
  },
  async current(userId: string) {
    const actor = await this.actorForUser(userId);
    return { ...actor, permissions: workspacePermissions(actor) };
  },
};
