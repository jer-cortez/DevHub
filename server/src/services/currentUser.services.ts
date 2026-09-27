import type { Request } from 'express';
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
 * The identity binder preserves a GitHub-synced local row, attaches the Auth
 * UUID atomically, and rejects either key if it is already linked elsewhere.
 */
export async function resolveLocalUser(req: Request): Promise<User> {
  return req.user!.local_user;
}
