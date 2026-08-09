import { apiRequest } from "./apiClient";

export interface LinkedPr {
  dependency_id: string;
  note: string | null;
  pr_id: string;
  github_pr_number: number;
  title: string;
  status: string;
  github_url: string;
  repo_id: string;
  repo_name: string;
}

export interface PrDependencyView {
  blockedBy: LinkedPr[];
  blocking: LinkedPr[];
  isBlocked: boolean;
  /** Blockers closed without merging — the link will never resolve on its own. */
  abandonedBlockers: LinkedPr[];
}

export const PrDependenciesAPI = {
  getForPr: (prId: string) => apiRequest<PrDependencyView>(`/api/pr-dependencies/${prId}`),

  link: (prId: string, blockingPrId: string, note?: string) =>
    apiRequest<{ id: string }>(`/api/pr-dependencies/${prId}/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocking_pr_id: blockingPrId, note }),
    }),

  unlink: (dependencyId: string) =>
    apiRequest<{ message: string }>(`/api/pr-dependencies/link/${dependencyId}`, {
      method: "DELETE",
    }),

  /** Unmerged-blocker counts for a whole list, so the PR list needs one call rather than one per row. */
  blockedCounts: (prIds: string[]) =>
    prIds.length === 0
      ? Promise.resolve({} as Record<string, number>)
      : apiRequest<Record<string, number>>(
          `/api/pr-dependencies/blocked-counts?prIds=${prIds.join(",")}`
        ),
};

export const prDependenciesKey = (prId: string) => ["pr-dependencies", prId] as const;
export const blockedCountsKey = (prIds: string[]) =>
  prIds.length === 0 ? null : (["pr-blocked-counts", ...prIds] as const);
