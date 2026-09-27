/** Workspace policy is deliberately independent of HTTP and database access. */
export const organizationRoles = ['member', 'admin'] as const;
export const teamRoles = ['developer', 'designer', 'tech_lead', 'project_manager'] as const;
export type OrganizationRole = typeof organizationRoles[number];
export type TeamRole = typeof teamRoles[number];

export interface WorkspaceActor {
  userId: string;
  organizationId: string;
  organizationRole: OrganizationRole | null;
  active: boolean;
  team: { repoId: string; role: TeamRole } | null;
}

export function isOrganizationRole(value: string): value is OrganizationRole {
  return organizationRoles.some(role => role === value);
}
export function isTeamRole(value: string): value is TeamRole {
  return teamRoles.some(role => role === value);
}
export function isTeamLead(role: TeamRole): boolean {
  return role === 'tech_lead' || role === 'project_manager';
}

export function workspacePermissions(actor: WorkspaceActor) {
  const active = actor.active && actor.organizationRole !== null
    && isOrganizationRole(actor.organizationRole)
    && (actor.team === null || isTeamRole(actor.team.role));
  const admin = active && actor.organizationRole === 'admin';
  const teamMember = active && actor.team !== null;
  const lead = teamMember && isTeamLead(actor.team!.role);
  return {
    viewProjects: active,
    followProjects: active,
    viewOrganizationOverview: admin,
    manageOrganizationMembers: admin,
    createTeamTasks: teamMember,
    manageTeamTasks: lead,
    approveTeamTasks: lead,
    manageTeamSprints: lead,
    manageTeamContributors: lead || admin,
  };
}

/** Admins manage membership, but do not gain task-approval power across teams. */
export function canManageTeamMember(
  actor: WorkspaceActor,
  targetRepoId: string,
  current: { repoId: string; role: TeamRole } | null,
  proposedRole: TeamRole | null,
): boolean {
  if (!actor.active || !actor.organizationRole || !isOrganizationRole(actor.organizationRole)) return false;
  if (actor.team && !isTeamRole(actor.team.role)) return false;
  if (current && !isTeamRole(current.role)) return false;
  if (proposedRole !== null && !isTeamRole(proposedRole)) return false;
  if (actor.organizationRole === 'admin') return true;
  if (!actor.team || actor.team.repoId !== targetRepoId || !isTeamLead(actor.team.role)) return false;
  if (current && (current.repoId !== targetRepoId || isTeamLead(current.role))) return false;
  return proposedRole === null || !isTeamLead(proposedRole);
}
