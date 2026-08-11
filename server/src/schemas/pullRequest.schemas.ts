import { z } from 'zod';

export const createPullRequestBody = z.object({
  github_pr_id: z.coerce.bigint(),
  github_pr_number: z.number().int().positive(),
  repo_id: z.uuid(),
  author_id: z.uuid(),
  title: z.string().trim().min(1).max(1000),
  body: z.string().max(50000).optional(),
  status: z.string().trim().min(1).max(50).optional(),
  base_branch: z.string().trim().min(1).max(500),
  head_branch: z.string().trim().min(1).max(500),
  github_url: z.url().max(2048),
  last_synced_at: z.coerce.date().optional(),
  closed_at: z.coerce.date().optional(),
  merged_at: z.coerce.date().optional(),
  head_sha: z.string().max(64).optional(),
});
