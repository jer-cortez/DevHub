declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string | undefined;
        avatar_url: string;
      };
    }
  }
}

export {};
