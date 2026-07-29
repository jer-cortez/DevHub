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
};
