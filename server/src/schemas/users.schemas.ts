import { z } from 'zod';

export const createUserBody = z.object({
  github_id: z.number().int().positive(),
  username: z.string().trim().min(1).max(255),
  avatar_url: z.url().max(2048).optional(),
  email: z.email().max(320).optional(),
});
