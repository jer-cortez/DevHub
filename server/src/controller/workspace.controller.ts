import type { Request, Response } from 'express';
import { resolveLocalUser } from '../services/currentUser.services';
import { WorkspaceError, WorkspaceServices } from '../services/workspace.services';

export const WorkspaceController = {
  async mine(req: Request, res: Response) {
    try {
      const user = await resolveLocalUser(req);
      const context = await WorkspaceServices.current(user.id);
      res.status(200).json({ data: {
        user: { id: user.id, username: user.username, avatarUrl: user.avatar_url, githubConnected: user.github_id !== null },
        ...context,
      } });
    } catch (error) {
      if (error instanceof WorkspaceError) res.status(error.status).json({ error: error.message });
      else res.status(503).json({ error: 'Workspace context is temporarily unavailable' });
    }
  },
};
