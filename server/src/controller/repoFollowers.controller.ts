import type { Request, Response } from 'express';
import { RepoFollowersServices, type FollowPreferences } from '../services/repoFollowers.services';
import { resolveLocalUser } from '../services/currentUser.services';

/** Picks only the known preference booleans out of a request body, so a client can't set arbitrary columns via the spread. */
function extractPreferences(body: unknown): Partial<FollowPreferences> {
  const source = (body ?? {}) as Record<string, unknown>;
  const preferences: Partial<FollowPreferences> = {};
  const keys: (keyof FollowPreferences)[] = [
    'notify_pull_requests',
    'notify_issues',
    'notify_comments',
  ];
  for (const key of keys) {
    if (typeof source[key] === 'boolean') preferences[key] = source[key] as boolean;
  }
  return preferences;
}

export const RepoFollowersController = {
  async findMine(req: Request, res: Response) {
    try {
      const user = await resolveLocalUser(req);
      const follows = await RepoFollowersServices.findForUser(user.id);
      res.status(200).json({ data: follows });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch followed repositories' });
    }
  },
  async follow(req: Request, res: Response) {
    try {
      const repoId = req.body?.repoId as string | undefined;
      if (!repoId) {
        res.status(400).json({ error: 'repoId is required' });
        return;
      }

      const user = await resolveLocalUser(req);
      const follow = await RepoFollowersServices.follow(
        user.id,
        repoId,
        extractPreferences(req.body)
      );
      res.status(200).json({ data: follow });
    } catch (error) {
      res.status(500).json({ error: 'Failed to follow repository' });
    }
  },
  async updatePreferences(req: Request, res: Response) {
    try {
      const user = await resolveLocalUser(req);
      const follow = await RepoFollowersServices.updatePreferences(
        user.id,
        req.params.repoId as string,
        extractPreferences(req.body)
      );
      res.status(200).json({ data: follow });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update follow preferences' });
    }
  },
  async unfollow(req: Request, res: Response) {
    try {
      const user = await resolveLocalUser(req);
      await RepoFollowersServices.unfollow(user.id, req.params.repoId as string);
      res.status(200).json({ data: null });
    } catch (error) {
      res.status(500).json({ error: 'Failed to unfollow repository' });
    }
  },
};
