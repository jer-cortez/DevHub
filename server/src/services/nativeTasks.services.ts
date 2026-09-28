import { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/prismaClient';
import { WorkspaceServices, WorkspaceError } from './workspace.services';
import { canAssignTask, canCreateTask, canMutateTask, canReadTask, canTransitionTask, isTaskCategory, isTaskStatus } from './taskPolicy';
import { isOrganizationRole, isTeamLead } from './workspacePolicy';

const fail = (status: number, message: string): never => { throw new WorkspaceError(status, message); };
const serial = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable };
async function context(userId: string, repoId: string, db: Prisma.TransactionClient | typeof prisma = prisma) {
  const actor = await WorkspaceServices.actorForUser(userId, db);
  const repo = await db.repositories.findUnique({ where: { id: repoId }, select: { org_id: true } });
  if (!repo) throw new WorkspaceError(404, 'Repository not found');
  if (repo.org_id !== actor.organizationId) fail(403, 'Forbidden');
  return { actor, scope: { organizationId: repo.org_id, repoId } };
}
async function taskContext(userId: string, id: string, db: Prisma.TransactionClient | typeof prisma = prisma) {
  const task = await db.tasks.findUnique({ where: { id } });
  if (!task) throw new WorkspaceError(404, 'Task not found');
  return { task, ...await context(userId, task.repo_id, db) };
}
async function assigneeActor(userId: string | null, orgId: string, repoId: string, db: Prisma.TransactionClient | typeof prisma = prisma) {
  if (userId === null) return null;
  const membership = await db.organization_members.findUnique({ where: { user_id_org_id: { user_id: userId, org_id: orgId } } });
  const team = await db.team_memberships.findUnique({ where: { user_id: userId } });
  return { userId, organizationId: orgId, organizationRole: membership?.role as 'member' | 'admin' | null ?? null,
    active: membership?.status === 'active', team: team ? { repoId: team.repo_id, role: team.role as 'developer' } : null };
}
async function validSprint(repoId: string, sprintId: string | null, status: string, db: Pick<Prisma.TransactionClient, 'sprints'> = prisma) {
  if (status !== 'backlog' && !sprintId) fail(400, 'Non-backlog tasks require a sprint');
  if (sprintId) {
    const sprint = await db.sprints.findUnique({ where: { id: sprintId } });
    if (!sprint || sprint.repo_id !== repoId || sprint.status === 'closed') fail(400, 'Sprint must be nonclosed and in the task repository');
  }
}
function mapDb(error: unknown): never {
  if (error instanceof WorkspaceError) throw error;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (['P2002', 'P2034'].includes(error.code)) fail(409, 'Conflicting concurrent change');
    if (error.code === 'P2003') fail(400, 'Invalid reference');
  }
  throw error;
}
async function notify(tx: Prisma.TransactionClient, userId: string | null, actorId: string, repoId: string, taskId: string, type: string, title: string) {
  if (userId && userId !== actorId) await tx.notifications.create({ data: { user_id: userId, actor_id: actorId, repo_id: repoId, type, title, url: `/dashboard/repositories/${repoId}/tasks/${taskId}`, is_direct: true } });
}
export const NativeTasksServices = {
  async list(userId: string, repoId: string) {
    const { actor, scope } = await context(userId, repoId);
    if (!canReadTask(actor, scope)) fail(403, 'Forbidden');
    return prisma.tasks.findMany({ where: { repo_id: repoId }, orderBy: { created_at: 'desc' } });
  },
  async read(userId: string, id: string) {
    const { task, actor, scope } = await taskContext(userId, id);
    if (!canReadTask(actor, scope)) fail(403, 'Forbidden');
    const [comments, links] = await Promise.all([prisma.task_comments.findMany({ where: { task_id: id }, orderBy: { created_at: 'asc' } }), prisma.task_pr_links.findMany({ where: { task_id: id } })]);
    return { ...task, comments, links };
  },
  async create(userId: string, data: { repoId: string; title: string; description?: string; category: string; sprintId?: string | null; assigneeId?: string | null }) {
    try { return await prisma.$transaction(async tx => {
      const { actor, scope } = await context(userId, data.repoId, tx);
      if (!canCreateTask(actor, scope, data.category)) fail(403, 'Forbidden');
      await validSprint(data.repoId, data.sprintId ?? null, 'backlog', tx);
      const assignee = data.assigneeId === undefined ? null : await assigneeActor(data.assigneeId, scope.organizationId, data.repoId, tx);
      if (data.assigneeId !== undefined && !canAssignTask(actor, scope, assignee)) fail(403, 'Invalid assignment');
      const task = await tx.tasks.create({ data: { repo_id: data.repoId, title: data.title, description: data.description, category: data.category, sprint_id: data.sprintId, assignee_id: data.assigneeId, created_by: userId } });
      await notify(tx, task.assignee_id, userId, data.repoId, task.id, 'task_assigned', task.title);
      return task;
    }, serial); } catch (e) { return mapDb(e); }
  },
  async edit(userId: string, id: string, data: { title?: string; description?: string | null; category?: string; status?: string; sprintId?: string | null; assigneeId?: string | null; version: number }) {
    try { return await prisma.$transaction(async tx => {
      const { task, actor, scope } = await taskContext(userId, id, tx);
      if (data.version !== task.version) fail(409, 'Task changed; reload it');
      if (!canMutateTask(actor, scope)) fail(403, 'Forbidden');
      if (data.category !== undefined && !isTaskCategory(data.category)) fail(400, 'Invalid category');
      if (data.status !== undefined && (!isTaskStatus(data.status) || !canTransitionTask(actor, scope, task.status, data.status))) fail(403, 'Transition forbidden');
      const assignee = data.assigneeId === undefined ? null : await assigneeActor(data.assigneeId, scope.organizationId, task.repo_id, tx);
      if (data.assigneeId !== undefined && !canAssignTask(actor, scope, assignee)) fail(403, 'Assignment forbidden');
      const status = data.status ?? task.status;
      const sprintId = data.sprintId === undefined ? task.sprint_id : data.sprintId;
      await validSprint(task.repo_id, sprintId, status, tx);
      const updated = await tx.tasks.updateMany({ where: { id, version: task.version }, data: {
        title: data.title, description: data.description, category: data.category,
        status: data.status, sprint_id: data.sprintId, assignee_id: data.assigneeId,
        version: { increment: 1 }, updated_at: new Date(),
      } });
      if (!updated.count) fail(409, 'Task changed; reload it');
      const result = await tx.tasks.findUniqueOrThrow({ where: { id } });
      if (data.assigneeId !== undefined && data.assigneeId !== task.assignee_id) await notify(tx, data.assigneeId, userId, task.repo_id, id, 'task_assigned', task.title);
      if (data.status === 'in_review') {
        const leads = await tx.team_memberships.findMany({ where: { repo_id: task.repo_id, role: { in: ['tech_lead', 'project_manager'] } }, select: { user_id: true } });
        for (const lead of leads) {
          const member = await tx.organization_members.findUnique({ where: { user_id_org_id: { user_id: lead.user_id, org_id: scope.organizationId } } });
          if (member?.status === 'active' && isOrganizationRole(member.role)) await notify(tx, lead.user_id, userId, task.repo_id, id, 'task_review_requested', task.title);
        }
      }
      if (data.status === 'done') await notify(tx, result.assignee_id, userId, task.repo_id, id, 'task_approved', task.title);
      return result;
    }, serial); } catch (e) { return mapDb(e); }
  },
  async comment(userId: string, id: string, body: string) {
    try { return await prisma.$transaction(async tx => {
    const { task, actor, scope } = await taskContext(userId, id, tx);
    if (!canMutateTask(actor, scope)) fail(403, 'Forbidden');
    return tx.task_comments.create({ data: { task_id: task.id, author_id: userId, body } });
    }, serial); } catch (e) { return mapDb(e); }
  },
  async link(userId: string, id: string, prId: string) {
    try { return await prisma.$transaction(async tx => {
    const { task, actor, scope } = await taskContext(userId, id, tx);
    if (!canMutateTask(actor, scope)) fail(403, 'Forbidden');
    const pr = await tx.pull_request.findUnique({ where: { id: prId }, select: { repo_id: true } });
    if (!pr || pr.repo_id !== task.repo_id) fail(400, 'PR must belong to task repository');
    return await tx.task_pr_links.create({ data: { task_id: id, repo_id: task.repo_id, pr_id: prId, created_by: userId } });
    }, serial); } catch (e) { return mapDb(e); }
  },
  async unlink(userId: string, id: string, prId: string) {
    try { return await prisma.$transaction(async tx => {
    const { actor, scope } = await taskContext(userId, id, tx);
    if (!canMutateTask(actor, scope)) fail(403, 'Forbidden');
    const deleted = await tx.task_pr_links.deleteMany({ where: { task_id: id, pr_id: prId } });
    if (!deleted.count) fail(404, 'Link not found');
    return { deleted: true };
    }, serial); } catch (e) { return mapDb(e); }
  },
  async sprints(userId: string, repoId: string) {
    const { actor, scope } = await context(userId, repoId);
    if (!canReadTask(actor, scope)) fail(403, 'Forbidden');
    return prisma.sprints.findMany({ where: { repo_id: repoId }, orderBy: { created_at: 'desc' } });
  },
  async createSprint(userId: string, repoId: string, name: string) {
    try { return await prisma.$transaction(async tx => {
    const { actor, scope } = await context(userId, repoId, tx);
    if (!canMutateTask(actor, scope) || !actor.team || !isTeamLead(actor.team.role)) fail(403, 'Forbidden');
    return tx.sprints.create({ data: { repo_id: repoId, name, created_by: userId } });
    }, serial); } catch (e) { return mapDb(e); }
  },
  async startSprint(userId: string, id: string) {
    try { return await prisma.$transaction(async tx => {
      const sprint = await tx.sprints.findUnique({ where: { id } });
      if (!sprint) throw new WorkspaceError(404, 'Sprint not found');
      const { actor, scope } = await context(userId, sprint.repo_id, tx);
      if (!canMutateTask(actor, scope) || !actor.team || !isTeamLead(actor.team.role)) fail(403, 'Forbidden');
      const changed = await tx.sprints.updateMany({ where: { id, status: 'planned' }, data: { status: 'active', started_at: new Date() } });
      if (!changed.count) fail(409, 'Sprint is not planned');
      return tx.sprints.findUniqueOrThrow({ where: { id } });
    }, serial); } catch (e) { return mapDb(e); }
  },
  async closeSprint(userId: string, id: string, choices: { taskId: string; action: 'backlog' | 'carryover'; sprintId?: string }[]) {
    try { return await prisma.$transaction(async tx => {
      const sprint = await tx.sprints.findUnique({ where: { id } });
      if (!sprint) throw new WorkspaceError(404, 'Sprint not found');
      const { actor, scope } = await context(userId, sprint.repo_id, tx);
      if (!canMutateTask(actor, scope) || !actor.team || !isTeamLead(actor.team.role)) fail(403, 'Forbidden');
      const current = await tx.sprints.findUniqueOrThrow({ where: { id } });
      if (current.status !== 'active') fail(409, 'Sprint is not active');
      const unfinished = await tx.tasks.findMany({ where: { sprint_id: id, status: { not: 'done' } } });
      if (choices.length !== unfinished.length || new Set(choices.map(x => x.taskId)).size !== unfinished.length || unfinished.some(t => !choices.some(x => x.taskId === t.id))) fail(400, 'Every unfinished task needs one choice');
      for (const task of unfinished) {
        const choice = choices.find(x => x.taskId === task.id)!;
        if (choice.action === 'carryover') {
          const target = choice.sprintId && await tx.sprints.findUnique({ where: { id: choice.sprintId } });
          if (!target || target.repo_id !== sprint.repo_id || target.status !== 'planned' || target.id === id) fail(400, 'Carryover target must be a planned sprint in the same repository');
        } else if (choice.action !== 'backlog') fail(400, 'Invalid close choice');
        const moved = await tx.tasks.updateMany({ where: { id: task.id, version: task.version, sprint_id: id }, data: choice.action === 'backlog'
          ? { status: 'backlog', sprint_id: null, version: { increment: 1 }, updated_at: new Date() }
          : { sprint_id: choice.sprintId, version: { increment: 1 }, updated_at: new Date() } });
        if (!moved.count) fail(409, 'Task changed during close');
      }
      const changed = await tx.sprints.updateMany({ where: { id, status: 'active' }, data: { status: 'closed', closed_at: new Date() } });
      if (!changed.count) fail(409, 'Sprint changed during close');
      return tx.sprints.findUniqueOrThrow({ where: { id } });
    }, serial); } catch (e) { return mapDb(e); }
  },
};
