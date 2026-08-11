"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationsSB = void 0;
const prismaClient_1 = require("../config/prismaClient");
exports.OrganizationsSB = {
    async findAll() {
        return prismaClient_1.prisma.organizations.findMany();
    },
    async findById(id) {
        return prismaClient_1.prisma.organizations.findUnique({ where: { id } });
    },
    async create(payload) {
        return prismaClient_1.prisma.organizations.create({ data: payload });
    },
    async delete(id) {
        return prismaClient_1.prisma.organizations.delete({ where: { id } });
    },
    async upsertByGithubOrgId(data) {
        return prismaClient_1.prisma.organizations.upsert({
            where: { github_org_id: data.github_org_id },
            update: { name: data.name, avatar_url: data.avatar_url },
            create: { ...data, created_at: new Date() },
        });
    },
};
