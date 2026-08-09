import type { Request, Response } from 'express';
import { ReviewCommentsServices } from '../services/reviewComments.services';

export const ReviewCommentsController = {
  async findAll(_req: Request, res: Response) {
    try {
      const comments = await ReviewCommentsServices.findAll();
      res.status(200).json({ data: comments });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch review comments' });
    }
  },
  async findById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const comment = await ReviewCommentsServices.findById(id);
      res.status(200).json({ data: comment });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch review comment' });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const comment = await ReviewCommentsServices.create(req.body);
      res.status(201).json({ data: comment });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create review comment' });
    }
  },
  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await ReviewCommentsServices.delete(id);
      res.status(200).json({ message: 'Review comment deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete review comment' });
    }
  },
  /** Comment counts for multiple PRs at once, e.g. GET /counts?prIds=a,b,c — used to populate the PR list's comment-count badges in one request instead of one per PR. */
  async countByPrIds(req: Request, res: Response) {
    try {
      const prIds = ((req.query.prIds as string) ?? '').split(',').filter(Boolean);
      const counts = await ReviewCommentsServices.countByPrIds(prIds);
      res.status(200).json({ data: counts });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch comment counts' });
    }
  },
  /** Same, for issues — GET /issue-counts?issueIds=a,b,c. */
  async countByIssueIds(req: Request, res: Response) {
    try {
      const issueIds = ((req.query.issueIds as string) ?? '').split(',').filter(Boolean);
      const counts = await ReviewCommentsServices.countByIssueIds(issueIds);
      res.status(200).json({ data: counts });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch issue comment counts' });
    }
  },
};
