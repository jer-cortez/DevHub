import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../config/prismaClient', () => ({ prisma: { repositories: { findUnique: vi.fn() }, organization_members: { findUnique: vi.fn() }, team_memberships: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn() }, $transaction: vi.fn() } }));
vi.mock('../workspace.services', async () => { const real = await vi.importActual<typeof import('../workspace.services')>('../workspace.services'); return { ...real, WorkspaceServices: { actorForUser: vi.fn() } }; });
import { prisma } from '../../config/prismaClient';
import { WorkspaceServices } from '../workspace.services';
import { ManagedTeamsServices } from '../managedTeams.services';
const db = prisma as any;
beforeEach(() => { vi.resetAllMocks(); db.repositories.findUnique.mockResolvedValue({ org_id: 'org' }); db.organization_members.findUnique.mockResolvedValue({ status: 'active', role: 'member' }); db.team_memberships.findUnique.mockResolvedValue(null); db.$transaction.mockImplementation((fn: any) => fn(db)); });
it('lead cannot assign a lead role', async () => {
  vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue({ userId: 'lead', organizationId: 'org', organizationRole: 'member', active: true, team: { repoId: 'repo', role: 'tech_lead' } });
  await expect(ManagedTeamsServices.assign('lead','target','repo','tech_lead')).rejects.toMatchObject({ status: 403 });
});
it('admin can assign a lead role', async () => {
  vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue({ userId: 'admin', organizationId: 'org', organizationRole: 'admin', active: true, team: null });
  db.team_memberships.create.mockResolvedValue({ role: 'tech_lead' });
  await expect(ManagedTeamsServices.assign('admin','target','repo','tech_lead')).resolves.toMatchObject({ role: 'tech_lead' });
});
it('rejects inactive target', async () => {
  vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue({ userId: 'admin', organizationId: 'org', organizationRole: 'admin', active: true, team: null });
  db.organization_members.findUnique.mockResolvedValue({ status: 'inactive' });
  await expect(ManagedTeamsServices.assign('admin','target','repo','developer')).rejects.toMatchObject({ status: 400 });
});

it('rejects an active target with an invalid organization role', async () => {
  vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue({ userId: 'admin', organizationId: 'org', organizationRole: 'admin', active: true, team: null });
  db.organization_members.findUnique.mockResolvedValue({ status: 'active', role: 'invalid' });
  await expect(ManagedTeamsServices.assign('admin','target','repo','developer')).rejects.toMatchObject({ status: 400 });
  expect(db.team_memberships.create).not.toHaveBeenCalled();
});
