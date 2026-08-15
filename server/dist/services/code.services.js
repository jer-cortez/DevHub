"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeServices = void 0;
const repositories_services_1 = require("./repositories.services");
const github_1 = require("../lib/github");
const cache_1 = require("../lib/cache");
const ORG_NAME = process.env.GITHUB_ORG_NAME;
/**
 * GitHub's REST API doesn't return a total commit count directly, but the
 * pagination Link header does have one: fetching with per_page=1 and
 * looking at the "last" page number equals the total commit count. This is
 * the standard trick for getting that number without walking every page.
 */
function parseLastPageFromLinkHeader(link) {
    if (!link)
        return null;
    const match = link.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
    return match ? parseInt(match[1], 10) : null;
}
exports.codeServices = {
    // These three all hit GitHub's REST API directly, which is both slower
    // than our own Postgres reads and subject to GitHub's rate limits — so
    // unlike the rest of this app's DB-backed reads, these are worth
    // caching. `repo` is resolved first (a cheap DB lookup) so the cache
    // key always uses the *actual* branch name, even when the caller
    // omitted `ref` and meant "the default branch" — otherwise an implicit
    // and an explicit request for the same branch would miss each other's
    // cache entries.
    async getContents(repoId, path, ref) {
        const repo = await repositories_services_1.RepositoriesServices.findById(repoId);
        const actualRef = ref || repo.default_branch;
        const cacheKey = `code:contents:${repoId}:${actualRef}:${path}`;
        return (0, cache_1.cached)(cacheKey, 60, async () => {
            const { data } = await github_1.octokit.rest.repos.getContent({ owner: ORG_NAME, repo: repo.name, path, ref: actualRef });
            if (Array.isArray(data)) {
                return data;
            }
            if (data.type === 'file' && 'content' in data) {
                return {
                    type: 'file',
                    name: data.name,
                    path: data.path,
                    size: data.size,
                    content: Buffer.from(data.content, 'base64').toString('utf-8'),
                };
            }
            throw new Error(`Unsupported content type at path "${path}"`);
        });
    },
    async listBranches(repoId) {
        const repo = await repositories_services_1.RepositoriesServices.findById(repoId);
        const cacheKey = `code:branches:${repoId}`;
        return (0, cache_1.cached)(cacheKey, 300, async () => {
            const { data } = await github_1.octokit.rest.repos.listBranches({ owner: ORG_NAME, repo: repo.name });
            return data.map((branch) => branch.name);
        });
    },
    /**
     * Repo-level latest commit (not per-file — GitHub's own UI computes
     * per-file last-commit info via an internal API; doing that with the
     * plain REST API would mean one commit-history call per visible file,
     * which doesn't scale). Also returns the total commit count on this
     * branch, via the Link-header trick above.
     */
    async getLastCommit(repoId, ref) {
        const repo = await repositories_services_1.RepositoriesServices.findById(repoId);
        const actualRef = ref || repo.default_branch;
        const cacheKey = `code:last-commit:${repoId}:${actualRef}`;
        return (0, cache_1.cached)(cacheKey, 60, async () => {
            const response = await github_1.octokit.rest.repos.listCommits({
                owner: ORG_NAME,
                repo: repo.name,
                sha: actualRef,
                per_page: 1,
            });
            const commit = response.data[0];
            const totalCount = parseLastPageFromLinkHeader(response.headers.link) ?? response.data.length;
            return {
                sha: commit.sha,
                shortSha: commit.sha.slice(0, 7),
                message: commit.commit.message.split('\n')[0],
                authorLogin: commit.author?.login ?? commit.commit.author?.name ?? 'unknown',
                authorAvatarUrl: commit.author?.avatar_url ?? null,
                date: commit.commit.author?.date ?? null,
                totalCount,
            };
        });
    },
};
