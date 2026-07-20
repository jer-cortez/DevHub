import type { Request, Response } from 'express';
import { PullRequestServices } from '../services/pullRequest.services';

export const PullRequestController = {
  async findAll(_req: Request, res: Response) {
    try {
      const prs = await PullRequestServices.findAll();
      res.status(200).json({ data: prs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pull requests' });
    }
  },
  async findById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const pr = await PullRequestServices.findById(id);
      res.status(200).json({ data: pr });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pull request' });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const pr = await PullRequestServices.create(req.body);
      res.status(201).json({ data: pr });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create pull request' });
    }
  },
  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await PullRequestServices.delete(id);
      res.status(200).json({ message: 'Pull request deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete pull request' });
    }
  },
};
