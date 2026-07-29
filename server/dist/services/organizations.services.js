"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationsServices = void 0;
const organizationsSB_1 = require("../supabase/organizationsSB");
exports.OrganizationsServices = {
    async findAll() {
        return organizationsSB_1.OrganizationsSB.findAll();
    },
    async findById(id) {
        const org = await organizationsSB_1.OrganizationsSB.findById(id);
        if (!org)
            throw new Error('Organization not found');
        return org;
    },
    async create(payload) {
        return organizationsSB_1.OrganizationsSB.create(payload);
    },
    async delete(id) {
        return organizationsSB_1.OrganizationsSB.delete(id);
    },
    async upsertByGithubOrgId(data) {
        return organizationsSB_1.OrganizationsSB.upsertByGithubOrgId(data);
    },
};
