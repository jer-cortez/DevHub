import { z } from 'zod';

export const createPullRequestReviewerBody = z.object({
  pr_id: z.uuid(),
  user_id: z.uuid(),
  status: z.string().trim().min(1).max(50),
  reviewed_at: z.coerce.date().optional(),
  assigned_at: z.coerce.date(),
});
