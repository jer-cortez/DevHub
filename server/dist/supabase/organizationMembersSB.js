"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationMembersSB = void 0;
const prismaClient_1 = require("../config/prismaClient");
exports.OrganizationMembersSB = {
    async findAll() {
        return prismaClient_1.prisma.organization_members.findMany();
    },
    async findById(id) {
        return prismaClient_1.prisma.organization_members.findUnique({ where: { id } });
    },
    async create(payload) {
        return prismaClient_1.prisma.organization_members.create({ data: payload });
    },
    async delete(id) {
        return prismaClient_1.prisma.organization_members.delete({ where: { id } });
    },
};
