"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSB = void 0;
const prismaClient_1 = require("../config/prismaClient");
exports.UserSB = {
    async findAll() {
        return prismaClient_1.prisma.user.findMany();
    },
    async findById(id) {
        return prismaClient_1.prisma.user.findUnique({ where: { id } });
    },
    async createUser(payload) {
        return prismaClient_1.prisma.user.create({ data: payload });
    },
    async delete(id) {
        return prismaClient_1.prisma.user.delete({ where: { id } });
    },
    async upsertByGithubId(data) {
        return prismaClient_1.prisma.user.upsert({
            where: { github_id: data.github_id },
            update: {
                username: data.username,
                avatar_url: data.avatar_url,
                email: data.email,
            },
            create: data,
        });
    },
};
