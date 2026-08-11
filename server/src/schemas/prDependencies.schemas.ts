import { z } from 'zod';

export const linkDependencyBody = z.object({
  blocking_pr_id: z.uuid(),
  note: z.string().max(2000).optional(),
});
