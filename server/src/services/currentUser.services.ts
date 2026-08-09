import type { Request } from 'express';
import { UserServices } from './users.services';
import type { User } from '../generated/prisma/client';

/**
 * Resolves the authenticated request to a row in our own `users` table.
 *
 * This indirection is load-bearing: `req.user.id` set by AuthMiddleware is
 * the *Supabase Auth* UUID, which is a different value from `users.id`
 * (Prisma's own UUID). Every foreign key in this schema — author_id,
 * created_by, user_id — refers to the latter, so writing `req.user.id`
 * into any of them produces a row that silently joins to nothing.
 *
 * It's an upsert rather than a lookup so a user who authenticates before
 * ever being synced from GitHub still gets a local row on first use.
 */
export async function resolveLocalUser(req: Request): Promise<User> {
  return UserServices.upsertByGithubId({
    github_id: req.user!.github_id,
    username: req.user!.username,
    avatar_url: req.user!.avatar_url,
    email: req.user!.email,
  });
}
