import { z } from 'zod';

export const createRepositoryBody = z.object({
  github_repo_id: z.coerce.bigint(),
  org_id: z.uuid(),
  name: z.string().trim().min(1).max(255),
  description: z.string().max(2000),
  is_private: z.boolean(),
  default_branch: z.string().trim().min(1).max(255),
  last_synced_at: z.coerce.date(),
});
