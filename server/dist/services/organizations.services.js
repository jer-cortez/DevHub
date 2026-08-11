"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationsServices = void 0;
const organizationsSB_1 = require("../supabase/organizationsSB");
const github_1 = require("../lib/github");
const cache_1 = require("../lib/cache");
const ORG_NAME = process.env.GITHUB_ORG_NAME;
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
    /**
     * The org-wide README GitHub renders on an org's profile page lives at
     * `profile/README.md` in a special repo literally named ".github" — it's
     * opt-in, so most orgs won't have one, and a 404 here just means that.
     * Cached for an hour since org READMEs change rarely.
     */
    async getReadme() {
        const cacheKey = `org:readme:${ORG_NAME}`;
        return (0, cache_1.cached)(cacheKey, 3600, async () => {
            try {
                const { data } = await github_1.octokit.rest.repos.getContent({
                    owner: ORG_NAME,
                    repo: '.github',
                    path: 'profile/README.md',
                });
                if (Array.isArray(data) || !('content' in data))
                    return null;
                return Buffer.from(data.content, 'base64').toString('utf-8');
            }
            catch {
                return null;
            }
        });
    },
};
