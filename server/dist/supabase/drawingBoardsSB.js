"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrawingBoardsSB = void 0;
const prismaClient_1 = require("../config/prismaClient");
exports.DrawingBoardsSB = {
    async findAll() {
        return prismaClient_1.prisma.drawing_boards.findMany();
    },
    async findById(id) {
        return prismaClient_1.prisma.drawing_boards.findUnique({ where: { id } });
    },
    async create(payload) {
        return prismaClient_1.prisma.drawing_boards.create({ data: payload });
    },
    async delete(id) {
        return prismaClient_1.prisma.drawing_boards.delete({ where: { id } });
    },
    async update(id, data) {
        return prismaClient_1.prisma.drawing_boards.update({ where: { id }, data });
    },
    async findByRepoId(repoId) {
        return prismaClient_1.prisma.drawing_boards.findMany({ where: { repo_id: repoId } });
    }
};
