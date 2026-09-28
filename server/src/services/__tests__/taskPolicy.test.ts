import { describe, expect, it } from 'vitest';
import {
  canAssignTask, canCreateTask, canMutateTask, canReadTask, canTransitionTask,
  isTaskCategory, isTaskStatus, type TaskStatus,
} from '../taskPolicy';
import type { WorkspaceActor } from '../workspacePolicy';

const actor = (overrides: Partial<WorkspaceActor> = {}): WorkspaceActor => ({
  userId: 'u1', organizationId: 'org1', organizationRole: 'member', active: true,
  team: { repoId: 'repo1', role: 'developer' }, ...overrides,
});
const task = { organizationId: 'org1', repoId: 'repo1' };

describe('task access policy', () => {
  it('allows active organization members to read across repos, while mutations stay with owning team', () => {
    expect(canReadTask(actor({ team: null }), { ...task, repoId: 'repo2' })).toBe(true);
    expect(canMutateTask(actor({ team: { repoId: 'repo2', role: 'developer' } }), task)).toBe(false);
    expect(canReadTask(actor({ organizationId: 'org2' }), task)).toBe(false);
    expect(canMutateTask(actor(), { ...task, organizationId: 'org2' })).toBe(false);
  });

  it.each([
    actor({ active: false }), actor({ organizationRole: null }),
    actor({ organizationRole: 'owner' as WorkspaceActor['organizationRole'] }),
    actor({ team: { repoId: 'repo1', role: 'owner' as never } }),
  ])('fails closed for inactive or invalid membership', invalid => {
    expect(canReadTask(invalid, task)).toBe(false);
    expect(canMutateTask(invalid, task)).toBe(false);
  });

  it('allows team members to create/edit and submit, but admin alone cannot approve', () => {
    expect(canCreateTask(actor(), task, 'general')).toBe(true);
    expect(canCreateTask(actor(), task, 'other')).toBe(false);
    expect(canMutateTask(actor({ organizationRole: 'admin', team: null }), task)).toBe(false);
    const admin = actor({ organizationRole: 'admin', team: { repoId: 'repo1', role: 'developer' } });
    expect(canTransitionTask(admin, task, 'in_review', 'done')).toBe(false);
    expect(canTransitionTask(actor({ team: { repoId: 'repo1', role: 'tech_lead' } }), task, 'in_review', 'done')).toBe(true);
  });

  it('checks valid runtime status and category values', () => {
    expect(isTaskStatus('in_review')).toBe(true);
    expect(isTaskStatus('cancelled')).toBe(false);
    expect(isTaskStatus(null)).toBe(false);
    expect(isTaskCategory('designer')).toBe(true);
    expect(isTaskCategory('other')).toBe(false);
  });
});

describe('task transitions', () => {
  it.each([
    ['backlog', 'todo', 'developer', true], ['todo', 'in_progress', 'designer', true],
    ['in_progress', 'in_review', 'developer', true], ['in_review', 'done', 'tech_lead', true],
    ['in_review', 'done', 'project_manager', true], ['in_review', 'in_progress', 'tech_lead', true],
    ['done', 'todo', 'project_manager', true], ['backlog', 'in_progress', 'tech_lead', false],
    ['todo', 'in_review', 'developer', false], ['in_review', 'done', 'developer', false],
    ['done', 'backlog', 'tech_lead', false], ['todo', 'todo', 'tech_lead', false],
  ] as const)('%s to %s as %s => %s', (from, to, role, allowed) => {
    expect(canTransitionTask(actor({ team: { repoId: 'repo1', role } }), task, from, to)).toBe(allowed);
  });
  it('rejects unknown statuses at runtime', () => {
    expect(canTransitionTask(actor(), task, 'unknown', 'todo')).toBe(false);
    expect(canTransitionTask(actor(), task, 'todo' as TaskStatus, 'unknown')).toBe(false);
  });
});

describe('task assignment', () => {
  const lead = actor({ team: { repoId: 'repo1', role: 'tech_lead' } });
  it('allows a lead to assign active same-organization, same-repo members or unassign', () => {
    expect(canAssignTask(lead, task, actor({ team: { repoId: 'repo1', role: 'designer' } }))).toBe(true);
    expect(canAssignTask(lead, task, null)).toBe(true);
  });
  it('rejects non-leads, cross-org/repo, inactive and invalid-role assignees', () => {
    expect(canAssignTask(actor(), task, actor())).toBe(false);
    expect(canAssignTask(lead, task, actor({ organizationId: 'org2' }))).toBe(false);
    expect(canAssignTask(lead, task, actor({ team: { repoId: 'repo2', role: 'developer' } }))).toBe(false);
    expect(canAssignTask(lead, task, actor({ active: false }))).toBe(false);
    expect(canAssignTask(lead, task, actor({ team: { repoId: 'repo1', role: 'invalid' as never } }))).toBe(false);
  });
});
