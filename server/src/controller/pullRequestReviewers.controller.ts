import type { Request, Response } from 'express';
import { PullRequestReviewersServices } from '../services/pullRequestReviewers.services';

export const PullRequestReviewersController = {
  async findAll(_req: Request, res: Response) {
    try {
      const reviewers = await PullRequestReviewersServices.findAll();
      res.status(200).json({ data: reviewers });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pull request reviewers' });
    }
  },
  async findById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const reviewer = await PullRequestReviewersServices.findById(id);
      res.status(200).json({ data: reviewer });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pull request reviewer' });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const reviewer = await PullRequestReviewersServices.create(req.body);
      res.status(201).json({ data: reviewer });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create pull request reviewer' });
    }
  },
  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await PullRequestReviewersServices.delete(id);
      res.status(200).json({ message: 'Pull request reviewer deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete pull request reviewer' });
    }
  },
};
