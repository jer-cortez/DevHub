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

export interface PullRequestSummary {
  summary: string;
  impact: string;
  /** The model only saw part of the diff — surfaced to the reader as a caveat. */
  truncated: boolean;
  model: string;
  summarized_at: string;
}

export const PullRequestsAPI = {
  findByRepoId: (repoId: string) => apiRequest<PullRequest[]>(`/api/pull-requests/by-repo/${repoId}`),
  /** Every PR across the org — used by the dependency picker, which links across repos. */
  findAll: () => apiRequest<PullRequest[]>("/api/pull-requests/all"),
  syncFromGithub: (repoId: string) =>
    apiRequest<PullRequest[]>(`/api/pull-requests/sync/${repoId}`, { method: "POST" }),
  /**
   * POST because it may generate — but it's idempotent per head commit: the
   * server returns the stored summary unless the PR has new commits since.
   */
  summarize: (prId: string) =>
    apiRequest<PullRequestSummary>(`/api/pull-requests/${prId}/summarize`, { method: "POST" }),
};

export const pullRequestsKey = (repoId: string) => ["pull-requests", repoId] as const;
