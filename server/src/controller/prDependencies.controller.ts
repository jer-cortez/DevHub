import type { Request, Response } from 'express';
import { PrDependenciesServices, DependencyError } from '../services/prDependencies.services';
import { resolveLocalUser } from '../services/currentUser.services';

export const PrDependenciesController = {
  async getForPr(req: Request, res: Response) {
    try {
      const prId = req.params.prId as string;
      res.status(200).json({ data: await PrDependenciesServices.getForPr(prId) });
    } catch (error) {
      console.error('Failed to fetch PR dependencies:', error);
      res.status(500).json({ error: 'Failed to fetch dependencies' });
    }
  },

  async link(req: Request, res: Response) {
    try {
      const blockedPrId = req.params.prId as string;
      const { blocking_pr_id: blockingPrId, note } = req.body ?? {};

      if (!blockingPrId) {
        return res.status(400).json({ error: 'blocking_pr_id is required' });
      }

      // Must be the local users.id — req.user.id is the Supabase Auth UUID and
      // would violate the created_by foreign key.
      const user = await resolveLocalUser(req);
      const dependency = await PrDependenciesServices.link(
        blockedPrId,
        blockingPrId,
        user.id,
        note
      );
      res.status(201).json({ data: dependency });
    } catch (error) {
      // Cycles, self-blocks, and non-open PRs are all user-correctable, so
      // they get a 400 with the explanation rather than a generic 500.
      if (error instanceof DependencyError) {
        return res.status(400).json({ error: error.message });
      }
      console.error('Failed to link PR dependency:', error);
      res.status(500).json({ error: 'Failed to link dependency' });
    }
  },

  async unlink(req: Request, res: Response) {
    try {
      await PrDependenciesServices.unlink(req.params.dependencyId as string);
      res.status(200).json({ data: { message: 'Dependency removed' } });
    } catch (error) {
      if (error instanceof DependencyError) {
        return res.status(404).json({ error: error.message });
      }
      console.error('Failed to unlink PR dependency:', error);
      res.status(500).json({ error: 'Failed to remove dependency' });
    }
  },

  async blockedCounts(req: Request, res: Response) {
    try {
      const ids = String(req.query.prIds ?? '')
        .split(',')
        .filter(Boolean);
      res.status(200).json({ data: await PrDependenciesServices.blockedCounts(ids) });
    } catch (error) {
      console.error('Failed to fetch blocked counts:', error);
      res.status(500).json({ error: 'Failed to fetch blocked counts' });
    }
  },
};
