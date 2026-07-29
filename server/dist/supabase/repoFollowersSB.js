"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoFollowersSB = void 0;
const prismaClient_1 = require("../config/prismaClient");
exports.RepoFollowersSB = {
    async findAll() {
        return prismaClient_1.prisma.repo_followers.findMany();
    },
    async findById(id) {
        return prismaClient_1.prisma.repo_followers.findUnique({ where: { id } });
    },
    async create(payload) {
        return prismaClient_1.prisma.repo_followers.create({ data: payload });
    },
    async delete(id) {
        return prismaClient_1.prisma.repo_followers.delete({ where: { id } });
    },
};
