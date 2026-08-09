import type { Request, Response } from 'express';
import { OrgHealthServices } from '../services/orgHealth.services';

export const OrgHealthController = {
  async getDashboard(_req: Request, res: Response) {
    try {
      const health = await OrgHealthServices.getDashboard();
      res.status(200).json({ data: health });
    } catch (error) {
      console.error('Failed to build org health dashboard:', error);
      res.status(500).json({ error: 'Failed to load org health' });
    }
  },
};
