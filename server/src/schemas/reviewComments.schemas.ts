import { z } from 'zod';

export const createReviewCommentBody = z.object({
  github_comment_id: z.coerce.bigint(),
  review_id: z.uuid().optional(),
  pr_id: z.uuid().optional(),
  author_id: z.uuid(),
  body: z.string().trim().min(1).max(20000),
  file_path: z.string().max(1000).optional(),
  line_number: z.number().int().nonnegative().optional(),
  is_resolved: z.boolean(),
  issue_id: z.uuid().optional(),
});
