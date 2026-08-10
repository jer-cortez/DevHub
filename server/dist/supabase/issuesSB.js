"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssuesSB = void 0;
const prismaClient_1 = require("../config/prismaClient");
exports.IssuesSB = {
    async findById(id) {
        return prismaClient_1.prisma.issues.findUnique({ where: { id } });
    },
    async findByRepoId(repoId) {
        return prismaClient_1.prisma.issues.findMany({
            where: { repo_id: repoId },
            orderBy: { created_at: 'desc' },
        });
    },
    /** Mirrors PullRequestSB.findByRepoIdAndNumber — GitHub payloads identify an issue by (repo, number), not by our internal uuid. */
    async findByRepoIdAndNumber(repoId, issueNumber) {
        return prismaClient_1.prisma.issues.findFirst({
            where: { repo_id: repoId, github_issue_number: issueNumber },
        });
    },
    /**
     * Keyed on github_issue_id (the unique constraint) so replaying a webhook
     * or re-running the sync updates the existing row instead of inserting a
     * duplicate — same pattern as PullRequestSB.upsertByGithubPrId.
     */
    async upsertByGithubIssueId(data) {
        const payload = { ...data, last_synced_at: new Date() };
        return prismaClient_1.prisma.issues.upsert({
            where: { github_issue_id: data.github_issue_id },
            update: payload,
            create: payload,
        });
    },
};
