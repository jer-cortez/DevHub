"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoriesServices = void 0;
const repositoriesSB_1 = require("../supabase/repositoriesSB");
const organizations_services_1 = require("./organizations.services");
const github_1 = require("../lib/github");
const ORG_NAME = process.env.GITHUB_ORG_NAME;
exports.RepositoriesServices = {
    async findAll() {
        return repositoriesSB_1.RepositoriesSB.findAll();
    },
    async findById(id) {
        const repo = await repositoriesSB_1.RepositoriesSB.findById(id);
        if (!repo)
            throw new Error('Repository not found');
        return repo;
    },
    async create(payload) {
        return repositoriesSB_1.RepositoriesSB.create(payload);
    },
    async delete(id) {
        return repositoriesSB_1.RepositoriesSB.delete(id);
    },
    async upsertByGithubRepoId(data) {
        return repositoriesSB_1.RepositoriesSB.upsertByGithubRepoId(data);
    },
    async syncFromGithub() {
        const { data: githubOrg } = await github_1.octokit.rest.orgs.get({ org: ORG_NAME });
        const org = await organizations_services_1.OrganizationsServices.upsertByGithubOrgId({
            github_org_id: BigInt(githubOrg.id),
            name: githubOrg.login,
            avatar_url: githubOrg.avatar_url,
        });
        const { data: githubRepos } = await github_1.octokit.rest.repos.listForOrg({ org: ORG_NAME });
        return Promise.all(githubRepos.map((repo) => repositoriesSB_1.RepositoriesSB.upsertByGithubRepoId({
            github_repo_id: BigInt(repo.id),
            org_id: org.id,
            name: repo.name,
            description: repo.description ?? '',
            is_private: repo.private,
            default_branch: repo.default_branch ?? 'main',
        })));
    },
};
