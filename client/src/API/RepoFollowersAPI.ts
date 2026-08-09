import { apiRequest } from "./apiClient";

export interface FollowPreferences {
  notify_pull_requests: boolean;
  notify_issues: boolean;
  notify_comments: boolean;
}

export interface RepoFollow extends FollowPreferences {
  /** Serialized as a string: this column is a Postgres bigint, and the server stringifies BigInt globally in server.ts. */
  id: string;
  user_id: string;
  repo_id: string;
  followed_at: string;
}

export const RepoFollowersAPI = {
  findMine: () => apiRequest<RepoFollow[]>("/api/repo-followers/mine"),
  follow: (repoId: string, preferences?: Partial<FollowPreferences>) =>
    apiRequest<RepoFollow>("/api/repo-followers/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoId, ...preferences }),
    }),
  updatePreferences: (repoId: string, preferences: Partial<FollowPreferences>) =>
    apiRequest<RepoFollow>(`/api/repo-followers/${repoId}/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences),
    }),
  unfollow: (repoId: string) =>
    apiRequest<null>(`/api/repo-followers/${repoId}`, { method: "DELETE" }),
};

export const myFollowsKey = "my-follows" as const;
