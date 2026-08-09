import type { Request, Response } from 'express';
import { ExpertiseServices } from '../services/expertise.services';
import { resolveLocalUser } from '../services/currentUser.services';

export const ExpertiseController = {
  async suggestReviewers(req: Request, res: Response) {
    try {
      const prId = req.params.prId as string;
      res.status(200).json({ data: await ExpertiseServices.suggestReviewers(prId) });
    } catch (error) {
      console.error('Failed to suggest reviewers:', error);
      res.status(500).json({ error: 'Failed to suggest reviewers' });
    }
  },

  /** The current user's own "Allow automated PR review suggestions" setting. */
  async getMyOptIn(req: Request, res: Response) {
    try {
      const user = await resolveLocalUser(req);
      res.status(200).json({ data: { allow_review_suggestions: user.allow_review_suggestions } });
    } catch (error) {
      console.error('Failed to read suggestion preference:', error);
      res.status(500).json({ error: 'Failed to read preference' });
    }
  },

  async setMyOptIn(req: Request, res: Response) {
    try {
      const { allow } = req.body ?? {};
      if (typeof allow !== 'boolean') {
        return res.status(400).json({ error: 'allow must be a boolean' });
      }
      // resolveLocalUser, not req.user.id — the latter is the Supabase Auth
      // UUID and would not match users.id.
      const user = await resolveLocalUser(req);
      res.status(200).json({ data: await ExpertiseServices.setSuggestionOptIn(user.id, allow) });
    } catch (error) {
      console.error('Failed to update suggestion preference:', error);
      res.status(500).json({ error: 'Failed to update preference' });
    }
  },

  async getStats(_req: Request, res: Response) {
    try {
      res.status(200).json({ data: await ExpertiseServices.getIndexStats() });
    } catch (error) {
      console.error('Failed to read expertise index stats:', error);
      res.status(500).json({ error: 'Failed to read index stats' });
    }
  },
};
