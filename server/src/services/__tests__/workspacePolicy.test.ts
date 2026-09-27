import { describe, expect, it } from 'vitest';
import {
  canManageTeamMember,
  isOrganizationRole,
  isTeamRole,
  workspacePermissions,
  type OrganizationRole,
  type TeamRole,
  type WorkspaceActor,
} from '../workspacePolicy';

const actor = (overrides: Partial<WorkspaceActor> = {}): WorkspaceActor => ({
  userId: 'user-1',
  organizationId: 'org-1',
  organizationRole: 'member',
  active: true,
  team: { repoId: 'team-1', role: 'developer' },
  ...overrides,
});

const noCapabilities = {
  viewProjects: false,
  followProjects: false,
  viewOrganizationOverview: false,
  manageOrganizationMembers: false,
  createTeamTasks: false,
  manageTeamTasks: false,
  approveTeamTasks: false,
  manageTeamSprints: false,
  manageTeamContributors: false,
};

describe('workspacePermissions', () => {
  it.each([
    ['inactive member', actor({ active: false })],
    ['active member without an organization role', actor({ organizationRole: null })],
    ['unknown organization role', actor({ organizationRole: 'owner' as OrganizationRole })],
    ['unknown team role', actor({ team: { repoId: 'team-1', role: 'owner' as TeamRole } })],
  ])('%s receives no capabilities', (_label, workspaceActor) => {
    expect(workspacePermissions(workspaceActor)).toEqual(noCapabilities);
  });

  it.each(['developer', 'designer'] as const)(
    '%s can create tasks in their own team but cannot manage or approve them', role => {
      expect(workspacePermissions(actor({ team: { repoId: 'team-1', role } }))).toEqual({
        viewProjects: true,
        followProjects: true,
        viewOrganizationOverview: false,
        manageOrganizationMembers: false,
        createTeamTasks: true,
        manageTeamTasks: false,
        approveTeamTasks: false,
        manageTeamSprints: false,
        manageTeamContributors: false,
      });
    },
  );

  it.each(['tech_lead', 'project_manager'] as const)(
    '%s can manage and approve tasks only for their team', role => {
      expect(workspacePermissions(actor({ team: { repoId: 'team-1', role } }))).toMatchObject({
        createTeamTasks: true,
        manageTeamTasks: true,
        approveTeamTasks: true,
        manageTeamSprints: true,
        manageTeamContributors: true,
      });
    },
  );

  it('an organization admin without a team manages membership but cannot approve tasks', () => {
    expect(workspacePermissions(actor({ organizationRole: 'admin', team: null }))).toEqual({
      viewProjects: true,
      followProjects: true,
      viewOrganizationOverview: true,
      manageOrganizationMembers: true,
      createTeamTasks: false,
      manageTeamTasks: false,
      approveTeamTasks: false,
      manageTeamSprints: false,
      manageTeamContributors: true,
    });
  });

  it('an admin who is also a contributor still has no task lead permissions', () => {
    const permissions = workspacePermissions(actor({ organizationRole: 'admin' }));
    expect(permissions).toMatchObject({
      manageOrganizationMembers: true,
      createTeamTasks: true,
      manageTeamTasks: false,
      approveTeamTasks: false,
      manageTeamSprints: false,
    });
  });
});

describe('canManageTeamMember', () => {
  const lead = actor({ team: { repoId: 'team-1', role: 'tech_lead' } });

  it('does not let a lead manage contributors on another team', () => {
    expect(canManageTeamMember(lead, 'team-2', null, 'developer')).toBe(false);
  });

  it.each(['developer', 'designer'] as const)(
    'lets a lead assign an unassigned person as %s on their team', role => {
      expect(canManageTeamMember(lead, 'team-1', null, role)).toBe(true);
    },
  );

  it.each(['developer', 'designer'] as const)(
    'lets a lead change a same-team contributor to %s', role => {
      expect(canManageTeamMember(
        lead,
        'team-1',
        { repoId: 'team-1', role: 'developer' },
        role,
      )).toBe(true);
    },
  );

  it.each([
    ['assign a tech lead', null, 'tech_lead'],
    ['assign a project manager', null, 'project_manager'],
    ['remove an existing tech lead', { repoId: 'team-1', role: 'tech_lead' }, null],
    ['demote an existing project manager', { repoId: 'team-1', role: 'project_manager' }, 'developer'],
    ['transfer an existing contributor from another team', { repoId: 'team-2', role: 'developer' }, 'designer'],
  ] as const)('does not let a lead %s', (_label, current, proposedRole) => {
    expect(canManageTeamMember(lead, 'team-1', current, proposedRole)).toBe(false);
  });

  it.each([
    ['transfer a contributor across teams', { repoId: 'team-1', role: 'developer' }, 'team-2', 'designer'],
    ['assign a tech lead role', null, 'team-2', 'tech_lead'],
    ['remove leadership', { repoId: 'team-1', role: 'project_manager' }, 'team-2', null],
  ] as const)('lets an admin %s', (_label, current, targetRepoId, proposedRole) => {
    const admin = actor({ organizationRole: 'admin', team: null });
    expect(canManageTeamMember(admin, targetRepoId, current, proposedRole)).toBe(true);
  });

  it('rejects membership changes from inactive and unrecognized organization members', () => {
    expect(canManageTeamMember(actor({ active: false }), 'team-1', null, 'developer')).toBe(false);
    expect(canManageTeamMember(
      actor({ organizationRole: 'owner' as OrganizationRole }),
      'team-1',
      null,
      'developer',
    )).toBe(false);
  });

  it('rejects invalid role strings at runtime', () => {
    expect(isOrganizationRole('owner')).toBe(false);
    expect(isTeamRole('owner')).toBe(false);
    expect(canManageTeamMember(
      lead,
      'team-1',
      null,
      'owner' as TeamRole,
    )).toBe(false);
  });
});
