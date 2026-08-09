import { apiRequest } from "./apiClient";

export interface Repository {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  default_branch: string;
}

export interface RepoActivity {
  repoId: string;
  pushedAt: string | null;
  stargazersCount: number;
  forksCount: number;
  language: string | null;
  weeklyCommits: number[];
}

export const RepositoriesAPI = {
  findAll: () => apiRequest<Repository[]>("/api/repositories/all"),
  findById: (id: string) => apiRequest<Repository>(`/api/repositories/${id}`),
  syncFromGithub: () => apiRequest<Repository[]>("/api/repositories/sync", { method: "POST" }),
  listActivity: () => apiRequest<RepoActivity[]>("/api/repositories/activity"),
};

/**
 * SWR cache keys. Defined once here (not hand-typed per component) so every
 * component reading the same data shares one deduplicated request/cache
 * entry — e.g. DashboardShell and OverviewContent both read the repo list,
 * but with the same key they only ever fetch it once between them.
 */
export const repositoriesKey = "repositories" as const;
export const repositoryKey = (id: string) => ["repository", id] as const;
export const repositoriesActivityKey = "repositories-activity" as const;
