import { ReviewsSB } from '../supabase/reviewsSB';
import type { reviews, Prisma } from '../generated/prisma/client';

export const ReviewsServices = {
  async findAll(): Promise<reviews[]> {
    return ReviewsSB.findAll();
  },
  async findById(id: string): Promise<reviews> {
    const review = await ReviewsSB.findById(id);
    if (!review) throw new Error('Review not found');
    return review;
  },
  async create(payload: Prisma.reviewsCreateInput): Promise<reviews> {
    return ReviewsSB.create(payload);
  },
  async delete(id: string): Promise<reviews> {
    return ReviewsSB.delete(id);
  },
};
