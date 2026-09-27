import type { User } from '../generated/prisma/client';

/** Auth-provider bindings stay internal; they are not member-directory fields. */
export type PublicUser = Omit<User, 'auth_user_id'>;
export function publicUser(user: User): PublicUser {
  const { auth_user_id: _authUserId, ...profile } = user;
  return profile;
}
