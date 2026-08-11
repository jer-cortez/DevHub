import { z } from 'zod';

export const joinTeamBody = z.object({
  repoId: z.uuid(),
});
