"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoFollowersSB = void 0;
const prismaClient_1 = require("../config/prismaClient");
exports.RepoFollowersSB = {
    async findByUserId(userId) {
        return prismaClient_1.prisma.repo_followers.findMany({ where: { user_id: userId } });
    },
    async findByRepoId(repoId) {
        return prismaClient_1.prisma.repo_followers.findMany({ where: { repo_id: repoId } });
    },
    async findOne(userId, repoId) {
        return prismaClient_1.prisma.repo_followers.findUnique({
            where: { user_id_repo_id: { user_id: userId, repo_id: repoId } },
        });
    },
    /**
     * Followers of a repo who have opted into one specific event type. The
     * preference column is chosen by the caller rather than passed as a
     * string, so a typo can't silently match zero rows.
     */
    async findSubscribedToRepo(repoId, preference) {
        return prismaClient_1.prisma.repo_followers.findMany({
            where: { repo_id: repoId, [preference]: true },
        });
    },
    /** Following is an upsert on (user_id, repo_id) so re-following doesn't create a duplicate row, and re-following with new preferences updates them. */
    async follow(userId, repoId, preferences = {}) {
        return prismaClient_1.prisma.repo_followers.upsert({
            where: { user_id_repo_id: { user_id: userId, repo_id: repoId } },
            update: preferences,
            create: { user_id: userId, repo_id: repoId, ...preferences },
        });
    },
    async updatePreferences(userId, repoId, preferences) {
        return prismaClient_1.prisma.repo_followers.update({
            where: { user_id_repo_id: { user_id: userId, repo_id: repoId } },
            data: preferences,
        });
    },
    /** Idempotent, same reasoning as leaving a team. */
    async unfollow(userId, repoId) {
        await prismaClient_1.prisma.repo_followers.deleteMany({ where: { user_id: userId, repo_id: repoId } });
    },
};
