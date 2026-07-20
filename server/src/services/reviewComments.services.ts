import { ReviewCommentsSB } from '../supabase/reviewCommentsSB';
import type { review_comments, Prisma } from '../generated/prisma/client';

export const ReviewCommentsServices = {
  async findAll(): Promise<review_comments[]> {
    return ReviewCommentsSB.findAll();
  },
  async findById(id: string): Promise<review_comments> {
    const comment = await ReviewCommentsSB.findById(id);
    if (!comment) throw new Error('Review comment not found');
    return comment;
  },
  async create(payload: Prisma.review_commentsCreateInput): Promise<review_comments> {
    return ReviewCommentsSB.create(payload);
  },
  async delete(id: string): Promise<review_comments> {
    return ReviewCommentsSB.delete(id);
  },
};
