import type { Request, Response } from 'express';
import { OnboardingServices } from '../services/onboarding.services';
import { resolveLocalUser } from '../services/currentUser.services';

export const OnboardingController = {
  async getForPr(req: Request, res: Response) {
    try {
      const prId = req.params.prId as string;
      // Onboarding is per-viewer by definition — resolveLocalUser, not
      // req.user.id, which is the Supabase Auth UUID rather than users.id.
      const user = await resolveLocalUser(req);
      res.status(200).json({ data: await OnboardingServices.getForPr(prId, user.id) });
    } catch (error) {
      console.error('Failed to build onboarding view:', error);
      res.status(500).json({ error: 'Failed to load onboarding view' });
    }
  },
};
