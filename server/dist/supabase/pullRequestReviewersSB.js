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
};
