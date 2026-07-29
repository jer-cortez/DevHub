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
};
