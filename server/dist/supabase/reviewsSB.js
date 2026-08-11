"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsSB = void 0;
const prismaClient_1 = require("../config/prismaClient");
exports.ReviewsSB = {
    async findAll() {
        return prismaClient_1.prisma.reviews.findMany();
    },
    async findById(id) {
        return prismaClient_1.prisma.reviews.findUnique({ where: { id } });
    },
    async create(payload) {
        return prismaClient_1.prisma.reviews.create({ data: payload });
    },
    async delete(id) {
        return prismaClient_1.prisma.reviews.delete({ where: { id } });
    },
    async findByPrId(prId) {
        return prismaClient_1.prisma.reviews.findMany({ where: { pr_id: prId }, orderBy: { submitted_at: 'desc' } });
    },
    /** Keyed on GitHub's globally-unique review id, so re-syncing is a no-op rather than a duplicate. */
    async upsertByGithubReviewId(data) {
        return prismaClient_1.prisma.reviews.upsert({
            where: { github_review_id: data.github_review_id },
            update: data,
            create: data,
        });
    },
};
