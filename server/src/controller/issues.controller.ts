import type { Request, Response } from 'express';
import { IssuesServices } from '../services/issues.services';

export const IssuesController = {
  async findByRepoId(req: Request, res: Response) {
    try {
      const issues = await IssuesServices.findByRepoId(req.params.repoId as string);
      res.status(200).json({ data: issues });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch issues' });
    }
  },
  async findById(req: Request, res: Response) {
    try {
      const issue = await IssuesServices.findById(req.params.id as string);
      res.status(200).json({ data: issue });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch issue' });
    }
  },
  async sync(req: Request, res: Response) {
    try {
      const issues = await IssuesServices.syncFromGithub(req.params.repoId as string);
      res.status(200).json({ data: issues });
    } catch (error) {
      console.error('Failed to sync issues from GitHub:', error);
      res.status(500).json({ error: 'Failed to sync issues' });
    }
  },
};
