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
  async findByPrId(prId: string): Promise<review_comments[]> {
    return ReviewCommentsSB.findByPrId(prId);
  },
  async upsertByGithubCommentId(data: {
    github_comment_id: bigint;
    pr_id: string;
    author_id: string;
    body: string;
    review_id?: string | null;
    file_path?: string | null;
    line_number?: number | null;
    is_resolved: boolean;
  }): Promise<review_comments> {
    return ReviewCommentsSB.upsertByGithubCommentId(data);
  },
  async countByPrIds(prIds: string[]): Promise<Record<string, number>> {
    return ReviewCommentsSB.countByPrIds(prIds);
  },
};
