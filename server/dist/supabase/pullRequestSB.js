"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestSB = void 0;
const prismaClient_1 = require("../config/prismaClient");
exports.PullRequestSB = {
    async findAll() {
        return prismaClient_1.prisma.pull_request.findMany();
    },
    async findById(id) {
        return prismaClient_1.prisma.pull_request.findUnique({ where: { id } });
    },
    async create(payload) {
        return prismaClient_1.prisma.pull_request.create({ data: payload });
    },
    async delete(id) {
        return prismaClient_1.prisma.pull_request.delete({ where: { id } });
    },
    async findByRepoId(repoId) {
        return prismaClient_1.prisma.pull_request.findMany({ where: { repo_id: repoId } });
    },
    async findByGithubPrId(githubPrId) {
        return prismaClient_1.prisma.pull_request.findUnique({ where: { github_pr_id: githubPrId } });
    },
    /**
     * PR number is only unique per-repo (not globally, unlike github_pr_id),
     * so this needs both. Used for the issue_comment webhook event, whose
     * payload only carries the PR's number, not its global GitHub id.
     */
    async findByRepoIdAndNumber(repoId, prNumber) {
        return prismaClient_1.prisma.pull_request.findFirst({ where: { repo_id: repoId, github_pr_number: prNumber } });
    },
    /**
     * Written only by the summarizer. Kept off `upsertByGithubPrId` on purpose:
     * a GitHub sync must not clear a summary, and a summary must not overwrite
     * synced fields.
     */
    async setSummary(id, data) {
        return prismaClient_1.prisma.pull_request.update({
            where: { id },
            data: { ...data, summarized_at: new Date() },
        });
    },
    async upsertByGithubPrId(data) {
        const now = new Date();
        return prismaClient_1.prisma.pull_request.upsert({
            where: { github_pr_id: data.github_pr_id },
            update: { ...data, last_synced_at: now },
            create: { ...data, last_synced_at: now },
        });
    },
};
