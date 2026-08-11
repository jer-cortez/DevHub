"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewCommentsSB = void 0;
const prismaClient_1 = require("../config/prismaClient");
exports.ReviewCommentsSB = {
    async findAll() {
        return prismaClient_1.prisma.review_comments.findMany();
    },
    async findById(id) {
        return prismaClient_1.prisma.review_comments.findUnique({ where: { id } });
    },
    async create(payload) {
        return prismaClient_1.prisma.review_comments.create({ data: payload });
    },
    async delete(id) {
        return prismaClient_1.prisma.review_comments.delete({ where: { id } });
    },
    /** All comments (inline review comments and top-level PR conversation comments) for one PR. */
    async findByPrId(prId) {
        return prismaClient_1.prisma.review_comments.findMany({ where: { pr_id: prId } });
    },
    /** All comments on one issue. The issue counterpart of findByPrId — same table, discriminated by which of the two id columns is set. */
    async findByIssueId(issueId) {
        return prismaClient_1.prisma.review_comments.findMany({ where: { issue_id: issueId } });
    },
    /**
     * Upserts a comment keyed on GitHub's comment id, so re-delivered or
     * edited webhook events overwrite the same row instead of duplicating it.
     * `review_id`/`file_path`/`line_number` are null for top-level PR
     * conversation comments (issue_comment events), populated for inline
     * review comments (pull_request_review_comment events).
     *
     * Exactly one of `pr_id` / `issue_id` must be set — a DB check constraint
     * (`review_comments_pr_xor_issue`) enforces that, so a mistake here fails
     * loudly at write time rather than producing an orphaned comment.
     */
    async upsertByGithubCommentId(data) {
        return prismaClient_1.prisma.review_comments.upsert({
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
    async countByPrIds(prIds) {
        const grouped = await prismaClient_1.prisma.review_comments.groupBy({
            by: ['pr_id'],
            where: { pr_id: { in: prIds } },
            _count: { pr_id: true },
        });
        const counts = {};
        for (const row of grouped) {
            // pr_id is nullable now that this table also carries issue comments,
            // so it's typed `string | null` even though the `in: prIds` filter
            // above already excludes nulls.
            if (row.pr_id === null)
                continue;
            counts[row.pr_id] = row._count.pr_id;
        }
        return counts;
    },
    /** The issue counterpart of countByPrIds, for the issue list's comment badges. */
    async countByIssueIds(issueIds) {
        const grouped = await prismaClient_1.prisma.review_comments.groupBy({
            by: ['issue_id'],
            where: { issue_id: { in: issueIds } },
            _count: { issue_id: true },
        });
        const counts = {};
        for (const row of grouped) {
            if (row.issue_id === null)
                continue;
            counts[row.issue_id] = row._count.issue_id;
        }
        return counts;
    },
};
