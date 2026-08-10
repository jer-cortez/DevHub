"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoriesServices = void 0;
const repositoriesSB_1 = require("../supabase/repositoriesSB");
const organizations_services_1 = require("./organizations.services");
const github_1 = require("../lib/github");
const cache_1 = require("../lib/cache");
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
    /** Used by the webhook handler to map a GitHub payload's `repository.id` to our local repo row. */
    async findByGithubRepoId(githubRepoId) {
        const repo = await repositoriesSB_1.RepositoriesSB.findByGithubRepoId(githubRepoId);
        if (!repo)
            throw new Error('Repository not found for GitHub repo id');
        return repo;
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
        // The special ".github" repo exists only to hold the org profile
        // README (see OrganizationsServices.getReadme) — it's not a project
        // repo, so it shouldn't be synced or shown anywhere real repos are.
        const realRepos = githubRepos.filter((repo) => repo.name !== '.github');
        const synced = await Promise.all(realRepos.map((repo) => repositoriesSB_1.RepositoriesSB.upsertByGithubRepoId({
            github_repo_id: BigInt(repo.id),
            org_id: org.id,
            name: repo.name,
            description: repo.description ?? '',
            is_private: repo.private,
            default_branch: repo.default_branch ?? 'main',
        })));
        // The README lives in a repo we don't sync, so there's no other event
        // to hook its cache invalidation to — piggyback on the same manual
        // "Sync from GitHub" action that already refreshes everything else.
        await (0, cache_1.invalidateCachePattern)('org:readme:*');
        return synced;
    },
    /**
     * Repo-level GitHub stats (stars, forks, pushed_at, weekly commit counts)
     * for the overview page's activity-sorted repo list. Cached briefly since
     * these change often relative to code contents, but querying GitHub on
     * every render would burn rate limit fast for no real benefit.
     */
    async getActivity(repoId) {
        const repo = await exports.RepositoriesServices.findById(repoId);
        const cacheKey = `repo:activity:${repoId}`;
        return (0, cache_1.cached)(cacheKey, 300, async () => {
            const [{ data: repoData }, weeklyCommits] = await Promise.all([
                github_1.octokit.rest.repos.get({ owner: ORG_NAME, repo: repo.name }),
                github_1.octokit.rest.repos
                    .getCommitActivityStats({ owner: ORG_NAME, repo: repo.name })
                    .then((res) => (Array.isArray(res.data) ? res.data.slice(-12).map((week) => week.total) : []))
                    // GitHub returns 202 while it computes stats for a repo it hasn't
                    // seen queried before — treat that (and any other failure) as "no
                    // data yet" rather than failing the whole activity list.
                    .catch(() => []),
            ]);
            return {
                repoId,
                pushedAt: repoData.pushed_at,
                stargazersCount: repoData.stargazers_count,
                forksCount: repoData.forks_count,
                language: repoData.language,
                weeklyCommits,
            };
        });
    },
    async listActivity() {
        const repos = await repositoriesSB_1.RepositoriesSB.findAll();
        return Promise.all(repos.map((repo) => exports.RepositoriesServices.getActivity(repo.id)));
    },
};
