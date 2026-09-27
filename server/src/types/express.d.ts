import type { User as LocalUser } from '../generated/prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        auth_user_id: string;
        username: string;
        email: string | undefined;
        avatar_url: string | undefined;
        github_id: number;
        local_user: LocalUser;
      };
    }
  }
}

export {};
