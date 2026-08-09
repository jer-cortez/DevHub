import { apiRequest } from "./apiClient";

export interface ReviewerSuggestion {
  user_id: string;
  username: string;
  avatar_url: string | null;
  /** Overlapping concepts — the reason this person was suggested. */
  matched_segments: string[];
  repo_names: string[];
  repo_count: number;
  pr_count: number;
  last_touched_at: string;
  score: number;
  /** None of their matching work is in this repo — the cross-project case. */
  is_cross_repo: boolean;
}

export const ExpertiseAPI = {
  suggestReviewers: (prId: string) =>
    apiRequest<ReviewerSuggestion[]>(`/api/expertise/suggestions/${prId}`),

  getOptIn: () => apiRequest<{ allow_review_suggestions: boolean }>("/api/expertise/opt-in"),

  setOptIn: (allow: boolean) =>
    apiRequest<{ id: string; allow_review_suggestions: boolean }>("/api/expertise/opt-in", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allow }),
    }),

  getStats: () => apiRequest<{ touches: number; prs: number; users: number }>("/api/expertise/stats"),
};

export const reviewerSuggestionsKey = (prId: string) => ["reviewer-suggestions", prId] as const;
export const suggestionOptInKey = ["suggestion-opt-in"] as const;
