import { apiRequest } from "./apiClient";

export const ReviewCommentsAPI = {
  countsByPrIds: (prIds: string[]) =>
    apiRequest<Record<string, number>>(`/api/review-comments/counts?prIds=${prIds.join(",")}`),
};
