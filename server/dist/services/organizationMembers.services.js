"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationMembersServices = void 0;
const organizationMembersSB_1 = require("../supabase/organizationMembersSB");
const organizations_services_1 = require("./organizations.services");
const users_services_1 = require("./users.services");
const github_1 = require("../lib/github");
const ORG_NAME = process.env.GITHUB_ORG_NAME;
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
    /**
     * Joins organization_members with their user rows in application code,
     * since this schema has no Prisma @relation attributes anywhere to do a
     * nested query. Used by the People tab, which needs avatars/usernames,
     * not just the bare user_id foreign key.
     */
    async findAllWithUserInfo() {
        const members = await organizationMembersSB_1.OrganizationMembersSB.findAll();
        const users = await users_services_1.UserServices.findByIds(members.map((m) => m.user_id));
        const usersById = new Map(users.map((u) => [u.id, u]));
        return members
            .filter((m) => usersById.has(m.user_id))
            .map((m) => ({
            id: m.id,
            joined_at: m.joined_at,
            user: usersById.get(m.user_id),
        }));
    },
    async syncFromGithub() {
        const { data: githubOrg } = await github_1.octokit.rest.orgs.get({ org: ORG_NAME });
        const org = await organizations_services_1.OrganizationsServices.upsertByGithubOrgId({
            github_org_id: BigInt(githubOrg.id),
            name: githubOrg.login,
            avatar_url: githubOrg.avatar_url,
        });
        const { data: githubMembers } = await github_1.octokit.rest.orgs.listMembers({ org: ORG_NAME });
        await Promise.all(githubMembers.map(async (member) => {
            const user = await users_services_1.UserServices.upsertByGithubId({
                github_id: member.id,
                username: member.login,
                avatar_url: member.avatar_url,
            });
            return organizationMembersSB_1.OrganizationMembersSB.upsertByUserAndOrg({ user_id: user.id, org_id: org.id });
        }));
        return this.findAllWithUserInfo();
    },
};
