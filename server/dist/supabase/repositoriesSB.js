"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoriesSB = void 0;
const prismaClient_1 = require("../config/prismaClient");
exports.RepositoriesSB = {
    async findAll() {
        return prismaClient_1.prisma.repositories.findMany();
    },
    async findById(id) {
        return prismaClient_1.prisma.repositories.findUnique({ where: { id } });
    },
    /** Looks up a local repo row by GitHub's numeric repo id — used by the webhook handler, which only knows the GitHub id from the payload, not our internal UUID. */
    async findByGithubRepoId(githubRepoId) {
        return prismaClient_1.prisma.repositories.findUnique({ where: { github_repo_id: githubRepoId } });
    },
    async create(payload) {
        return prismaClient_1.prisma.repositories.create({ data: payload });
    },
    async delete(id) {
        return prismaClient_1.prisma.repositories.delete({ where: { id } });
    },
    async upsertByGithubRepoId(data) {
        const now = new Date();
        return prismaClient_1.prisma.repositories.upsert({
            where: { github_repo_id: data.github_repo_id },
            update: { ...data, last_synced_at: now },
            create: { ...data, last_synced_at: now },
        });
    },
};
