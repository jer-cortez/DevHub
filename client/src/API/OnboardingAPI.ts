import { apiRequest } from "./apiClient";

export interface AreaSummary {
  overview: string;
  key_files: { path: string; role: string }[];
  watch_for: string;
}

export interface RecentPr {
  id: string;
  github_pr_number: number;
  title: string;
  github_url: string;
  author: string;
  merged_at: string | null;
  summary: string | null;
}

export interface RelevantBoard {
  id: string;
  title: string;
  type: string;
  updated_at: string;
  matches_area: boolean;
}

export interface OnboardingView {
  /** False when the viewer has worked in this repo before — the panel hides itself. */
  isFirstTime: boolean;
  repo_id: string;
  repo_name: string;
  areaSegments: string[];
  boards: RelevantBoard[];
  recentPrs: RecentPr[];
  areaSummary: AreaSummary | null;
}

export const OnboardingAPI = {
  getForPr: (prId: string) => apiRequest<OnboardingView>(`/api/onboarding/${prId}`),
};

export const onboardingKey = (prId: string) => ["onboarding", prId] as const;
