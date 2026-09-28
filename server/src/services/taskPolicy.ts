/** Pure authorization and transition rules for checkpoint-2 tasks. */
import { isOrganizationRole, isTeamRole, isTeamLead, type WorkspaceActor } from './workspacePolicy';

export const taskStatuses = ['backlog', 'todo', 'in_progress', 'in_review', 'done'] as const;
export type TaskStatus = typeof taskStatuses[number];
export const taskCategories = ['developer', 'designer', 'general'] as const;
export type TaskCategory = typeof taskCategories[number];

export interface TaskScope { organizationId: string; repoId: string }
export interface TaskAssignee extends WorkspaceActor {}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (taskStatuses as readonly string[]).includes(value);
}
export function isTaskCategory(value: unknown): value is TaskCategory {
  return typeof value === 'string' && (taskCategories as readonly string[]).includes(value);
}

/** Reject malformed runtime actor data, including missing/invalid organization or team roles. */
export function isActiveWorkspaceActor(actor: WorkspaceActor): boolean {
  if (!actor || typeof actor !== 'object' || actor.active !== true
    || typeof actor.userId !== 'string' || !actor.userId
    || typeof actor.organizationId !== 'string' || !actor.organizationId
    || !isOrganizationRole(actor.organizationRole as string)) return false;
  return actor.team === null || (!!actor.team && typeof actor.team.repoId === 'string'
    && !!actor.team.repoId && isTeamRole(actor.team.role as string));
}

export function canReadTask(actor: WorkspaceActor, task: TaskScope): boolean {
  return isActiveWorkspaceActor(actor) && validTaskScope(task)
    && actor.organizationId === task.organizationId;
}

export function canMutateTask(actor: WorkspaceActor, task: TaskScope): boolean {
  return canReadTask(actor, task) && actor.team !== null
    && actor.team.repoId === task.repoId;
}

export function canCreateTask(actor: WorkspaceActor, task: TaskScope, category: unknown): boolean {
  return isTaskCategory(category) && canMutateTask(actor, task);
}

export function canAssignTask(actor: WorkspaceActor, task: TaskScope, assignee: TaskAssignee | null): boolean {
  if (!canMutateTask(actor, task) || !actor.team || !isTeamLead(actor.team.role)) return false;
  if (assignee === null) return true;
  return isActiveWorkspaceActor(assignee) && assignee.organizationId === task.organizationId
    && assignee.team !== null && assignee.team.repoId === task.repoId
    && isTeamRole(assignee.team.role);
}

export function canTransitionTask(actor: WorkspaceActor, task: TaskScope, from: unknown, to: unknown): boolean {
  if (!isTaskStatus(from) || !isTaskStatus(to) || from === to || !canMutateTask(actor, task) || !actor.team) return false;
  const lead = isTeamLead(actor.team.role);
  if ((from === 'backlog' && to === 'todo')
    || (from === 'todo' && to === 'in_progress')
    || (from === 'in_progress' && to === 'in_review')) return true;
  return lead && ((from === 'in_review' && (to === 'done' || to === 'in_progress'))
    || (from === 'done' && to === 'todo'));
}

function validTaskScope(task: TaskScope): boolean {
  return !!task && typeof task.organizationId === 'string' && !!task.organizationId
    && typeof task.repoId === 'string' && !!task.repoId;
}
