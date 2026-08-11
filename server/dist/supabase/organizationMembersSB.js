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
    /**
     * Upserts a membership row keyed on the (user_id, org_id) pair, so
     * re-running the members sync doesn't create duplicate rows for people
     * who are already members. `joined_at` is only set on first insert —
     * GitHub's list-members API doesn't return a join date, so there's
     * nothing meaningful to update on an already-existing membership.
     */
    async upsertByUserAndOrg(data) {
        return prismaClient_1.prisma.organization_members.upsert({
            where: { user_id_org_id: { user_id: data.user_id, org_id: data.org_id } },
            update: {},
            create: { ...data, joined_at: new Date() },
        });
    },
};
