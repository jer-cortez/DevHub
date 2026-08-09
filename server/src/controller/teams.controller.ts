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
  async join(req: Request, res: Response) {
    try {
      const repoId = req.body?.repoId as string | undefined;
      if (!repoId) {
        res.status(400).json({ error: 'repoId is required' });
        return;
      }

      const user = await resolveLocalUser(req);
      // Upsert on user_id — joining a new repo replaces the previous
      // membership rather than adding a second one.
      const membership = await TeamsServices.join(user.id, repoId);
      res.status(200).json({ data: membership });
    } catch (error) {
      res.status(500).json({ error: 'Failed to join team' });
    }
  },
  async leave(req: Request, res: Response) {
    try {
      const user = await resolveLocalUser(req);
      await TeamsServices.leave(user.id);
      res.status(200).json({ data: null });
    } catch (error) {
      res.status(500).json({ error: 'Failed to leave team' });
    }
  },
};
