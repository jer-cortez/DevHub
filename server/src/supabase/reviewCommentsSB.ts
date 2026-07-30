import { prisma } from '../config/prismaClient';
import type { review_comments, Prisma } from '../generated/prisma/client';

export const ReviewCommentsSB = {
  async findAll(): Promise<review_comments[]> {
    return prisma.review_comments.findMany();
  },
  async findById(id: string): Promise<review_comments | null> {
    return prisma.review_comments.findUnique({ where: { id } });
  },
  async create(payload: Prisma.review_commentsCreateInput): Promise<review_comments> {
    return prisma.review_comments.create({ data: payload });
  },
  async delete(id: string): Promise<review_comments> {
    return prisma.review_comments.delete({ where: { id } });
  },
  /** All comments (inline review comments and top-level PR conversation comments) for one PR. */
  async findByPrId(prId: string): Promise<review_comments[]> {
    return prisma.review_comments.findMany({ where: { pr_id: prId } });
  },
  /**
   * Upserts a comment keyed on GitHub's comment id, so re-delivered or
   * edited webhook events overwrite the same row instead of duplicating it.
   * `review_id`/`file_path`/`line_number` are null for top-level PR
   * conversation comments (issue_comment events), populated for inline
   * review comments (pull_request_review_comment events).
   */
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
    return prisma.review_comments.upsert({
      where: { github_comment_id: data.github_comment_id },
      update: data,
      create: data,
    });
  },
  /**
   * Comment counts grouped by PR, for the PR list's initial comment-count
   * badges. Not a Prisma relation `_count` query — this schema has no
   * `@relation` attributes anywhere (confirmed project-wide), so it's a
   * plain groupBy instead.
   */
  async countByPrIds(prIds: string[]): Promise<Record<string, number>> {
    const grouped = await prisma.review_comments.groupBy({
      by: ['pr_id'],
      where: { pr_id: { in: prIds } },
      _count: { pr_id: true },
    });

    const counts: Record<string, number> = {};
    for (const row of grouped) {
      counts[row.pr_id] = row._count.pr_id;
    }
    return counts;
  },
};
