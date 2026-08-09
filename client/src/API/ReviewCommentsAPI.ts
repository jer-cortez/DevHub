import { apiRequest } from "./apiClient";

export const ReviewCommentsAPI = {
  countsByPrIds: (prIds: string[]) =>
    apiRequest<Record<string, number>>(`/api/review-comments/counts?prIds=${prIds.join(",")}`),
};

/**
 * Keyed on the joined prIds string (not the array) so SWR's key equality
 * check — which compares by string/array shape, not deep object identity —
 * is stable across renders that recompute an equivalent-but-new array.
 */
export const reviewCommentCountsKey = (prIds: string[]) =>
  prIds.length > 0 ? (["review-comment-counts", prIds.join(",")] as const) : null;
