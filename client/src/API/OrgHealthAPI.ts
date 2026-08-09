import { apiRequest } from "./apiClient";

export interface OrgHealthSummary {
  openPrs: number;
  awaitingFirstReview: number;
  unassignedPrs: number;
  stalePrs: number;
  overloadedReviewers: number;
  quietRepos: number;
  blockedPrs: number;
}

export interface BlockerRef {
  github_pr_number: number;
  repo_name: string;
  status: string;
  github_url: string;
}

export interface BlockedPr {
  id: string;
  repo_name: string;
  github_pr_number: number;
  title: string;
  github_url: string;
  author: string;
  blocker_count: number;
  abandoned_count: number;
  blockers: BlockerRef[];
}

export interface StalePr {
  id: string;
  repo_id: string;
  repo_name: string;
  github_pr_number: number;
  title: string;
  github_url: string;
  author: string;
  created_at: string;
  last_activity_at: string;
  days_stale: number;
  reviewer_count: number;
}

export interface ReviewerLoad {
  user_id: string;
  username: string;
  avatar_url: string | null;
  pending_count: number;
  oldest_wait_days: number;
}

export interface QuietRepo {
  id: string;
  name: string;
  is_private: boolean;
  last_activity_at: string | null;
  days_quiet: number;
  open_prs: number;
}

export interface OrgHealth {
  summary: OrgHealthSummary;
  stalePrs: StalePr[];
  reviewerLoad: ReviewerLoad[];
  quietRepos: QuietRepo[];
  blockedPrs: BlockedPr[];
  /** Server-owned so the UI never hardcodes a number the queries disagree with. */
  thresholds: { stalePrDays: number; quietRepoDays: number; reviewerOverload: number };
}

export const OrgHealthAPI = {
  getDashboard: () => apiRequest<OrgHealth>("/api/org-health"),
};

export const orgHealthKey = ["org-health"] as const;
