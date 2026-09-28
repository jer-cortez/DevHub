import type { Request, Response } from 'express';
import { TeamsServices } from '../services/teams.services';
import { resolveLocalUser } from '../services/currentUser.services';

export const TeamsController = {
  /** The repo the authenticated user is currently working on, or null if they haven't joined one. */
  async findMine(req: Request, res: Response) {
    try {
      const user = await resolveLocalUser(req);
      const membership = await TeamsServices.findForUser(user.id);
      res.status(200).json({ data: membership });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch team membership' });
    }
  },
  async findByRepoId(req: Request, res: Response) {
    try {
      const members = await TeamsServices.findTeamForRepo(req.params.repoId as string);
      res.status(200).json({ data: members });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch team' });
    }
  },
  async join(_req: Request, res: Response) { res.status(403).json({ error: 'Use managed team assignment' }); },
  async leave(_req: Request, res: Response) { res.status(403).json({ error: 'Use managed team assignment' }); },
};
