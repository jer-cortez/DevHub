import { z } from 'zod';

export const createOrganizationBody = z.object({
  github_org_id: z.coerce.bigint(),
  name: z.string().trim().min(1).max(255),
  avatar_url: z.url().max(2048),
  created_at: z.coerce.date(),
});
