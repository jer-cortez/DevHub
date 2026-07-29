"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationMembersServices = void 0;
const organizationMembersSB_1 = require("../supabase/organizationMembersSB");
exports.OrganizationMembersServices = {
    async findAll() {
        return organizationMembersSB_1.OrganizationMembersSB.findAll();
    },
    async findById(id) {
        const member = await organizationMembersSB_1.OrganizationMembersSB.findById(id);
        if (!member)
            throw new Error('Organization member not found');
        return member;
    },
    async create(payload) {
        return organizationMembersSB_1.OrganizationMembersSB.create(payload);
    },
    async delete(id) {
        return organizationMembersSB_1.OrganizationMembersSB.delete(id);
    },
};
