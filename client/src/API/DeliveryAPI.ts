import { apiRequest } from "./apiClient";

// Delivery mount supplied by the workspace contract. Keep it centralized.
const root = "/api";
const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";
export type TaskCategory = "developer" | "designer" | "general";
export type TeamRole = "developer" | "designer" | "tech_lead" | "project_manager";
export interface WorkspaceMe { userId: string; organizationId: string; organizationRole: "member" | "admin" | null; active: boolean; team: { repoId: string; role: TeamRole } | null; permissions: { viewOrganizationOverview: boolean; manageOrganizationMembers: boolean; manageTeamContributors: boolean; manageTeamSprints: boolean; approveTeamTasks: boolean } }
export interface Task { id: string; repo_id: string; title: string; description: string | null; category: TaskCategory; status: TaskStatus; sprint_id: string | null; assignee_id: string | null; version: number; created_at: string; updated_at: string }
export interface TaskComment { id: string; author_id: string; body: string; created_at: string }
export interface TaskLink { pr_id: string }
export interface TaskDetail extends Task { comments: TaskComment[]; links: TaskLink[] }
export interface Sprint { id: string; repo_id: string; name: string; status: "planned" | "active" | "closed"; started_at: string | null; closed_at: string | null }
export type CloseChoice = { taskId: string; action: "backlog" } | { taskId: string; action: "carryover"; sprintId: string };
export const workspaceKey = "workspace-me" as const;
export const tasksKey = (repoId: string) => ["delivery-tasks", repoId] as const;
export const taskKey = (id: string) => ["delivery-task", id] as const;
export const sprintsKey = (repoId: string) => ["delivery-sprints", repoId] as const;
export const DeliveryAPI = {
  me: () => apiRequest<WorkspaceMe>("/api/workspace/me"),
  tasks: (repoId: string) => apiRequest<Task[]>(`${root}/repositories/${repoId}/tasks`),
  createTask: (body: { repoId: string; title: string; description?: string; category: TaskCategory; sprintId?: string; assigneeId?: string }) => apiRequest<Task>(`${root}/tasks`, json("POST", body)),
  task: (id: string) => apiRequest<TaskDetail>(`${root}/tasks/${id}`),
  editTask: (id: string, body: Partial<Pick<Task, "title" | "description" | "category" | "status">> & { version: number; sprintId?: string | null; assigneeId?: string | null }) => apiRequest<Task>(`${root}/tasks/${id}`, json("PATCH", body)),
  comment: (id: string, body: string) => apiRequest<TaskComment>(`${root}/tasks/${id}/comments`, json("POST", { body })),
  link: (id: string, prId: string) => apiRequest<TaskLink>(`${root}/tasks/${id}/pr-links`, json("POST", { prId })),
  unlink: (id: string, prId: string) => apiRequest<{ deleted: boolean }>(`${root}/tasks/${id}/pr-links/${prId}`, { method: "DELETE" }),
  sprints: (repoId: string) => apiRequest<Sprint[]>(`${root}/repositories/${repoId}/sprints`),
  createSprint: (repoId: string, name: string) => apiRequest<Sprint>(`${root}/repositories/${repoId}/sprints`, json("POST", { name })),
  startSprint: (id: string) => apiRequest<Sprint>(`${root}/sprints/${id}/start`, { method: "POST" }),
  closeSprint: (id: string, choices: CloseChoice[]) => apiRequest<Sprint>(`${root}/sprints/${id}/close`, json("POST", { choices })),
  assignMember: (repoId: string, userId: string, role: TeamRole | null) => apiRequest<unknown>(`/api/teams/by-repo/${repoId}/members/${userId}`, json("PUT", { role })),
};
export const ownsRepo = (me: WorkspaceMe | undefined, repoId: string) => !!me?.active && me.team?.repoId === repoId;
export const isLead = (me: WorkspaceMe | undefined, repoId: string) => ownsRepo(me, repoId) && (me?.team?.role === "tech_lead" || me?.team?.role === "project_manager");
