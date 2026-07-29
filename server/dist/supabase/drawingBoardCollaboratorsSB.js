"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrawingBoardCollaboratorsSB = void 0;
const prismaClient_1 = require("../config/prismaClient");
exports.DrawingBoardCollaboratorsSB = {
    async findAll() {
        return prismaClient_1.prisma.drawing_board_collaborators.findMany();
    },
    async findById(id) {
        return prismaClient_1.prisma.drawing_board_collaborators.findUnique({ where: { id } });
    },
    async create(payload) {
        return prismaClient_1.prisma.drawing_board_collaborators.create({ data: payload });
    },
    async delete(id) {
        return prismaClient_1.prisma.drawing_board_collaborators.delete({ where: { id } });
    },
};
