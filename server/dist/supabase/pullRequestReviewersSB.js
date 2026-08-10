"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestReviewersSB = void 0;
const prismaClient_1 = require("../config/prismaClient");
exports.PullRequestReviewersSB = {
    async findAll() {
        return prismaClient_1.prisma.pull_request_reviewers.findMany();
    },
    async findById(id) {
        return prismaClient_1.prisma.pull_request_reviewers.findUnique({ where: { id } });
    },
    async create(payload) {
        return prismaClient_1.prisma.pull_request_reviewers.create({ data: payload });
    },
    async delete(id) {
        return prismaClient_1.prisma.pull_request_reviewers.delete({ where: { id } });
    },
    /** Everyone asked to review a PR — used by notification fan-out to decide who an event *directly* concerns, not just who's nearby. */
    async findByPrId(prId) {
        return prismaClient_1.prisma.pull_request_reviewers.findMany({ where: { pr_id: prId } });
    },
    /**
     * A person is requested on a PR at most once, so (pr_id, user_id) is the
     * natural key. `assigned_at` is only set on insert — re-syncing must not
     * reset how long someone has been sitting on a request, which is exactly
     * the number the health dashboard reports.
     */
    async upsertByPrAndUser(data) {
        const { assigned_at, ...mutable } = data;
        return prismaClient_1.prisma.pull_request_reviewers.upsert({
            where: { pr_id_user_id: { pr_id: data.pr_id, user_id: data.user_id } },
            update: mutable,
            create: data,
        });
    },
    /**
     * Clears requests that GitHub no longer reports — a review was submitted or
     * the request was withdrawn. Without this, someone's pending count would
     * only ever grow.
     */
    async deleteStaleForPr(prId, keepUserIds) {
        const { count } = await prismaClient_1.prisma.pull_request_reviewers.deleteMany({
            where: { pr_id: prId, status: 'pending', user_id: { notIn: keepUserIds } },
        });
        return count;
    },
};
