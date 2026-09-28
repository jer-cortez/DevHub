import { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/prismaClient';
import { WorkspaceServices, WorkspaceError } from './workspace.services';
import { isOrganizationRole, canManageTeamMember, isTeamRole, type TeamRole } from './workspacePolicy';
export const ManagedTeamsServices = {
  async assign(actorId: string, userId: string, repoId: string, role: TeamRole | null) {
    try { return await prisma.$transaction(async tx => {
      const actor = await WorkspaceServices.actorForUser(actorId, tx);
      const repo = await tx.repositories.findUnique({ where: { id: repoId }, select: { org_id: true } });
      if (!repo) throw new WorkspaceError(404, 'Repository not found');
      if (repo.org_id !== actor.organizationId) throw new WorkspaceError(403, 'Forbidden');
      const target = await tx.organization_members.findUnique({ where: { user_id_org_id: { user_id: userId, org_id: repo.org_id } } });
      if (!target || target.status !== 'active' || !isOrganizationRole(target.role)) throw new WorkspaceError(400, 'Target needs active organization membership');
      const current = await tx.team_memberships.findUnique({ where: { user_id: userId } });
      const currentRole = current && isTeamRole(current.role) ? { repoId: current.repo_id, role: current.role } : null;
      if (current && !currentRole) throw new WorkspaceError(409, 'Invalid current team role');
      if (!canManageTeamMember(actor, repoId, currentRole, role)) throw new WorkspaceError(403, 'Forbidden');
      if (role === null) {
        if (!current || current.repo_id !== repoId) throw new WorkspaceError(404, 'Team member not found in repository');
        await tx.team_memberships.delete({ where: { user_id: userId } });
        return null;
      }
      if (current) return tx.team_memberships.update({ where: { user_id: userId }, data: { repo_id: repoId, role } });
      return tx.team_memberships.create({ data: { user_id: userId, repo_id: repoId, role } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && ['P2002','P2034'].includes(e.code)) throw new WorkspaceError(409, 'Conflicting team change'); throw e; }
  },
};
