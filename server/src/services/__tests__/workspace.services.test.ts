import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/prismaClient', () => ({
  prisma: {
    organizations: { findMany: vi.fn() },
    organization_members: { findUnique: vi.fn() },
    team_memberships: { findUnique: vi.fn() },
    repositories: { findFirst: vi.fn() },
  },
}));
import { prisma } from '../../config/prismaClient';
import { WorkspaceServices } from '../workspace.services';

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('GITHUB_ORG_NAME', 'nonprofit-org');
  vi.mocked(prisma.organizations.findMany).mockResolvedValue([{ id: 'org' }] as never);
  vi.mocked(prisma.organization_members.findUnique).mockResolvedValue({ role: 'member', status: 'active' } as never);
  vi.mocked(prisma.team_memberships.findUnique).mockResolvedValue({ repo_id: 'repo', role: 'tech_lead' } as never);
  vi.mocked(prisma.repositories.findFirst).mockResolvedValue({ id: 'repo' } as never);
});

afterEach(() => vi.unstubAllEnvs());

describe('workspace context', () => {
  it('resolves a team lead in the configured organization using local user ID', async () => {
    const result = await WorkspaceServices.current('local-user');
    expect(prisma.organization_members.findUnique).toHaveBeenCalledWith({ where: { user_id_org_id: { user_id: 'local-user', org_id: 'org' } } });
    expect(result.team).toEqual({ repoId: 'repo', role: 'tech_lead' });
    expect(result.permissions.approveTeamTasks).toBe(true);
    expect(result.permissions.manageOrganizationMembers).toBe(false);
  });

  it('does not infer membership from GitHub admission alone', async () => {
    vi.mocked(prisma.organization_members.findUnique).mockResolvedValue(null);
    const result = await WorkspaceServices.current('local-user');
    expect(result.organizationRole).toBeNull();
    expect(result.active).toBe(false);
    expect(Object.values(result.permissions).every(value => value === false)).toBe(true);
    expect(prisma.repositories.findFirst).not.toHaveBeenCalled();
  });

  it('does not grant roles for a team in a different organization', async () => {
    vi.mocked(prisma.repositories.findFirst).mockResolvedValue(null);
    const result = await WorkspaceServices.current('local-user');
    expect(prisma.repositories.findFirst).toHaveBeenCalledWith({ where: { id: 'repo', org_id: 'org' }, select: { id: true } });
    expect(result.team).toBeNull();
    expect(result.permissions.approveTeamTasks).toBe(false);
  });

  it.each(['inactive', 'unexpected-status'])('denies permissions when membership is %s', async status => {
    vi.mocked(prisma.organization_members.findUnique).mockResolvedValue({ role: 'admin', status } as never);
    const result = await WorkspaceServices.current('local-user');
    expect(Object.values(result.permissions).some(Boolean)).toBe(false);
  });

  it.each([{ rows: [] }, { rows: [{ id: 'one' }, { id: 'two' }] }])('fails closed for missing or ambiguous organization configuration', async ({ rows }) => {
    vi.mocked(prisma.organizations.findMany).mockResolvedValue(rows as never);
    await expect(WorkspaceServices.current('local-user')).rejects.toMatchObject({ status: 503 });
  });

  it('fails closed without configured organization name', async () => {
    vi.stubEnv('GITHUB_ORG_NAME', '');
    await expect(WorkspaceServices.current('local-user')).rejects.toMatchObject({ status: 503 });
    expect(prisma.organizations.findMany).not.toHaveBeenCalled();
  });

  it('does not expose provider bindings or profile data in permissions', async () => {
    const result = await WorkspaceServices.current('local-user');
    expect(result).not.toHaveProperty('auth_user_id');
    expect(result).not.toHaveProperty('email');
  });
});
