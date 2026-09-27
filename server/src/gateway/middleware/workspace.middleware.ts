import type { Request, Response, NextFunction } from 'express';
import { resolveLocalUser } from '../../services/currentUser.services';
import { WorkspaceError, WorkspaceServices } from '../../services/workspace.services';

/** Applied to account/organization management, not to ordinary GitHub reads. */
export async function requireWorkspaceAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    const user = await resolveLocalUser(req);
    const actor = await WorkspaceServices.actorForUser(user.id);
    if (!actor.active || actor.organizationRole !== 'admin') {
      res.status(403).json({ error: 'An active organization administrator is required' });
      return;
    }
    next();
  } catch (error) {
    if (error instanceof WorkspaceError) res.status(error.status).json({ error: error.message });
    else res.status(503).json({ error: 'Workspace permissions are temporarily unavailable' });
  }
}
