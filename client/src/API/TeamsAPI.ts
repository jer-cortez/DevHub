import { apiRequest } from "./apiClient";

/** A "team" is just the set of people working on a repo — membership is one repo at a time. */
export interface TeamMembership {
  id: string;
  user_id: string;
  repo_id: string;
  joined_at: string;
}

export interface TeamMember {
  id: string;
  joined_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export const TeamsAPI = {
  /** Null when the user hasn't joined a team yet. */
  findMine: () => apiRequest<TeamMembership | null>("/api/teams/mine"),
  findByRepoId: (repoId: string) => apiRequest<TeamMember[]>(`/api/teams/by-repo/${repoId}`),
  /** Joining is exclusive — this replaces any existing membership rather than adding one. */
  join: (repoId: string) =>
    apiRequest<TeamMembership>("/api/teams/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoId }),
    }),
  leave: () => apiRequest<null>("/api/teams/leave", { method: "POST" }),
};

export const myTeamKey = "my-team" as const;
export const teamByRepoKey = (repoId: string) => ["team-by-repo", repoId] as const;
