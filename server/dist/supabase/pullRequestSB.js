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
    async upsertByGithubPrId(data) {
        const now = new Date();
        return prismaClient_1.prisma.pull_request.upsert({
            where: { github_pr_id: data.github_pr_id },
            update: { ...data, last_synced_at: now },
            create: { ...data, last_synced_at: now },
        });
    },
};
