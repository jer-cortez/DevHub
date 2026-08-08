import { apiRequest } from "./apiClient";

export interface PullRequest {
  id: string;
  github_pr_number: number;
  title: string;
  status: string;
  base_branch: string;
  head_branch: string;
  github_url: string;
}

export const PullRequestsAPI = {
  findByRepoId: (repoId: string) => apiRequest<PullRequest[]>(`/api/pull-requests/by-repo/${repoId}`),
  syncFromGithub: (repoId: string) =>
    apiRequest<PullRequest[]>(`/api/pull-requests/sync/${repoId}`, { method: "POST" }),
};
