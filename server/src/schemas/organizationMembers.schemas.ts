import { z } from 'zod';

export const createOrganizationMemberBody = z.object({
  user_id: z.uuid().optional(),
  org_id: z.uuid().optional(),
  joined_at: z.coerce.date(),
});
