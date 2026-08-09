import { apiRequest } from "./apiClient";

export interface Issue {
  id: string;
  github_issue_number: number;
  repo_id: string;
  author_id: string;
  assignee_id: string | null;
  title: string;
  body: string | null;
  /** GitHub's own issue state: "open" or "closed". */
  status: string;
  github_url: string;
  created_at: string;
  closed_at: string | null;
}

export const IssuesAPI = {
  findByRepoId: (repoId: string) => apiRequest<Issue[]>(`/api/issues/by-repo/${repoId}`),
  syncFromGithub: (repoId: string) =>
    apiRequest<Issue[]>(`/api/issues/sync/${repoId}`, { method: "POST" }),
};

export const issuesKey = (repoId: string) => ["issues", repoId] as const;
