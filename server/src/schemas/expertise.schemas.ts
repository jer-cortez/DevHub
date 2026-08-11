import { z } from 'zod';

export const setOptInBody = z.object({
  allow: z.boolean(),
});
