import { z } from 'zod';

export const createReviewBody = z.object({
  github_review_id: z.coerce.bigint(),
  pr_id: z.uuid(),
  reviewer_id: z.uuid(),
  decision: z.string().trim().min(1).max(50),
  body: z.string().max(20000).optional(),
  submitted_at: z.coerce.date(),
});
