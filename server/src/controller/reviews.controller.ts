import type { Request, Response } from 'express';
import { ReviewsServices } from '../services/reviews.services';

export const ReviewsController = {
  async findAll(_req: Request, res: Response) {
    try {
      const reviews = await ReviewsServices.findAll();
      res.status(200).json({ data: reviews });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  },
  async findById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const review = await ReviewsServices.findById(id);
      res.status(200).json({ data: review });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch review' });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const review = await ReviewsServices.create(req.body);
      res.status(201).json({ data: review });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create review' });
    }
  },
  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await ReviewsServices.delete(id);
      res.status(200).json({ message: 'Review deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete review' });
    }
  },
};
