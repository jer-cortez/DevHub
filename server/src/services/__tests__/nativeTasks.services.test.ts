import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../config/prismaClient', () => ({ prisma: {
  repositories: { findUnique: vi.fn() }, tasks: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
  sprints: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
  organization_members: { findUnique: vi.fn() }, team_memberships: { findUnique: vi.fn(), findMany: vi.fn() },
  notifications: { create: vi.fn() }, task_comments: { findMany: vi.fn() }, task_pr_links: { findMany: vi.fn() },
  $transaction: vi.fn(),
} }));
vi.mock('../workspace.services', async () => {
  const real = await vi.importActual<typeof import('../workspace.services')>('../workspace.services');
  return { ...real, WorkspaceServices: { actorForUser: vi.fn() } };
});
import { prisma } from '../../config/prismaClient';
import { WorkspaceServices } from '../workspace.services';
import { NativeTasksServices } from '../nativeTasks.services';
const db = prisma as any;
const actor = (role: string, org = 'org') => ({ userId: 'actor', organizationId: org, organizationRole: 'member', active: true, team: { repoId: 'repo', role } });
beforeEach(() => {
  vi.resetAllMocks();
  db.repositories.findUnique.mockResolvedValue({ org_id: 'org' });
  db.tasks.findUnique.mockResolvedValue({ id: 'task', repo_id: 'repo', status: 'in_review', sprint_id: 'sprint', assignee_id: null, version: 0, title: 'Work' });
  db.sprints.findUnique.mockResolvedValue({ id: 'sprint', repo_id: 'repo', status: 'active' });
  db.sprints.findUniqueOrThrow.mockResolvedValue({ id: 'sprint', repo_id: 'repo', status: 'active' });
  db.$transaction.mockImplementation((callback: any) => callback(db));
});
describe('native task authorization and sprint validation', () => {
  it('rejects cross organization repository IDs', async () => {
    vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue(actor('developer', 'other') as any);
    await expect(NativeTasksServices.list('actor', 'repo')).rejects.toMatchObject({ status: 403 });
  });
  it('rejects developer approval even with a title edit', async () => {
    vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue(actor('developer') as any);
    await expect(NativeTasksServices.edit('actor', 'task', { version: 0, title: 'Changed', status: 'done' })).rejects.toMatchObject({ status: 403 });
    expect(db.$transaction).toHaveBeenCalledOnce();
  });
  it('rejects an assignee without active same repo membership', async () => {
    vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue(actor('tech_lead') as any);
    db.organization_members.findUnique.mockResolvedValue({ role: 'member', status: 'inactive' });
    db.team_memberships.findUnique.mockResolvedValue({ repo_id: 'repo', role: 'developer' });
    await expect(NativeTasksServices.edit('actor', 'task', { version: 0, assigneeId: 'someone' })).rejects.toMatchObject({ status: 403 });
  });
  it('requires every unfinished close choice', async () => {
    vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue(actor('project_manager') as any);
    db.tasks.findMany.mockResolvedValue([{ id: 'task', version: 0 }]);
    await expect(NativeTasksServices.closeSprint('actor', 'sprint', [])).rejects.toMatchObject({ status: 400 });
  });

  it('rejects a guessed newer version before transition policy runs', async () => {
    vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue(actor('developer') as any);
    await expect(NativeTasksServices.edit('actor', 'task', { version: 1, status: 'done' })).rejects.toMatchObject({ status: 409 });
    expect(db.tasks.updateMany).not.toHaveBeenCalled();
    expect(WorkspaceServices.actorForUser).toHaveBeenCalledWith('actor', db);
  });
  it('rejects a closed sprint while attaching a task', async () => {
    vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue(actor('tech_lead') as any);
    db.sprints.findUnique.mockResolvedValue({ id: 'sprint', repo_id: 'repo', status: 'closed' });
    await expect(NativeTasksServices.edit('actor', 'task', { version: 0, sprintId: 'sprint' })).rejects.toMatchObject({ status: 400 });
  });
  it('accepts a planned same-repository carryover and closes the sprint', async () => {
    vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue(actor('project_manager') as any);
    db.tasks.findMany.mockResolvedValue([{ id: 'task', version: 0 }]);
    db.sprints.findUnique.mockImplementation(({ where }: any) => Promise.resolve(where.id === 'next' ? { id: 'next', repo_id: 'repo', status: 'planned' } : { id: 'sprint', repo_id: 'repo', status: 'active' }));
    db.tasks.updateMany.mockResolvedValue({ count: 1 });
    db.sprints.updateMany.mockResolvedValue({ count: 1 });
    await expect(NativeTasksServices.closeSprint('actor', 'sprint', [{ taskId: 'task', action: 'carryover', sprintId: 'next' }])).resolves.toMatchObject({ status: 'active' });
    expect(db.tasks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sprint_id: 'next' }) }));
  });
  it('rejects carryover to another repository', async () => {
    vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue(actor('project_manager') as any);
    db.tasks.findMany.mockResolvedValue([{ id: 'task', version: 0 }]);
    db.sprints.findUnique.mockImplementation(({ where }: any) => Promise.resolve(where.id === 'next' ? { id: 'next', repo_id: 'other', status: 'planned' } : { id: 'sprint', repo_id: 'repo', status: 'active' }));
    await expect(NativeTasksServices.closeSprint('actor', 'sprint', [{ taskId: 'task', action: 'carryover', sprintId: 'next' }])).rejects.toMatchObject({ status: 400 });
  });
  it('sends review requests only to active leads with task URLs', async () => {
    vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue(actor('developer') as any);
    db.tasks.findUnique.mockResolvedValue({ id: 'task', repo_id: 'repo', status: 'in_progress', sprint_id: 'sprint', assignee_id: 'actor', version: 0, title: 'Work' });
    db.tasks.updateMany.mockResolvedValue({ count: 1 });
    db.tasks.findUniqueOrThrow.mockResolvedValue({ id: 'task', assignee_id: 'actor' });
    db.team_memberships.findMany.mockResolvedValue([{ user_id: 'lead' }, { user_id: 'inactive' }]);
    db.organization_members.findUnique.mockImplementation(({ where }: any) => Promise.resolve({ role: 'member', status: where.user_id_org_id.user_id === 'lead' ? 'active' : 'inactive' }));
    await NativeTasksServices.edit('actor', 'task', { version: 0, status: 'in_review' });
    expect(db.notifications.create).toHaveBeenCalledWith({ data: expect.objectContaining({ user_id: 'lead', type: 'task_review_requested', url: '/dashboard/repositories/repo/tasks/task' }) });
    expect(db.notifications.create).toHaveBeenCalledTimes(1);
  });

  it('maps the one-active-sprint unique collision to a conflict', async () => {
    vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue(actor('project_manager') as any);
    const { Prisma } = await import('../../generated/prisma/client');
    db.sprints.updateMany.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('active collision', { code: 'P2002', clientVersion: 'test' }));
    await expect(NativeTasksServices.startSprint('actor', 'sprint')).rejects.toMatchObject({ status: 409 });
  });
  it('sends assignment notifications to the new assignee', async () => {
    vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue(actor('tech_lead') as any);
    db.organization_members.findUnique.mockResolvedValue({ role: 'member', status: 'active' });
    db.team_memberships.findUnique.mockResolvedValue({ repo_id: 'repo', role: 'developer' });
    db.tasks.updateMany.mockResolvedValue({ count: 1 });
    db.tasks.findUniqueOrThrow.mockResolvedValue({ id: 'task', assignee_id: 'assignee' });
    await NativeTasksServices.edit('actor', 'task', { version: 0, assigneeId: 'assignee' });
    expect(db.notifications.create).toHaveBeenCalledWith({ data: expect.objectContaining({ user_id: 'assignee', type: 'task_assigned', url: '/dashboard/repositories/repo/tasks/task' }) });
  });
  it('sends an approval notification to the assignee', async () => {
    vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue(actor('tech_lead') as any);
    db.tasks.findUnique.mockResolvedValue({ id: 'task', repo_id: 'repo', status: 'in_review', sprint_id: 'sprint', assignee_id: 'assignee', version: 0, title: 'Work' });
    db.tasks.updateMany.mockResolvedValue({ count: 1 });
    db.tasks.findUniqueOrThrow.mockResolvedValue({ id: 'task', assignee_id: 'assignee' });
    await NativeTasksServices.edit('actor', 'task', { version: 0, status: 'done' });
    expect(db.notifications.create).toHaveBeenCalledWith({ data: expect.objectContaining({ user_id: 'assignee', type: 'task_approved', url: '/dashboard/repositories/repo/tasks/task' }) });
  });
  it('rejects stale versions as conflicts', async () => {
    vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue(actor('tech_lead') as any);
    db.tasks.updateMany.mockResolvedValue({ count: 0 });
    await expect(NativeTasksServices.edit('actor', 'task', { version: 0, title: 'Changed' })).rejects.toMatchObject({ status: 409 });
  });
});
