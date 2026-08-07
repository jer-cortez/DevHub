import { RepositoriesServices } from "./repositories.services"
import { octokit } from '../lib/github';

const ORG_NAME = process.env.GITHUB_ORG_NAME!;

/**
 * GitHub's REST API doesn't return a total commit count directly, but the
 * pagination Link header does have one: fetching with per_page=1 and
 * looking at the "last" page number equals the total commit count. This is
 * the standard trick for getting that number without walking every page.
 */
function parseLastPageFromLinkHeader(link: string | undefined): number | null {
    if (!link) return null;
    const match = link.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
    return match ? parseInt(match[1], 10) : null;
}

export const codeServices = {
    async getContents(repoId: string, path: string, ref?: string) {
        const repo = await RepositoriesServices.findById(repoId);

        const { data } = await octokit.rest.repos.getContent(
            { owner: ORG_NAME, repo: repo.name, path, ref: ref || repo.default_branch }
        )

        if (Array.isArray(data)) {
            return data
        }

        if (data.type === 'file' && 'content' in data) {
            return {
                type: 'file' as const,
                name: data.name,
                path: data.path,
                size: data.size,
                content: Buffer.from(data.content, 'base64').toString('utf-8'),
            };
        }

        throw new Error(`Unsupported content type at path "${path}"`);
    },
    async listBranches(repoId: string) {
        const repo = await RepositoriesServices.findById(repoId);
        const { data } = await octokit.rest.repos.listBranches({ owner: ORG_NAME, repo: repo.name });
        return data.map((branch) => branch.name);
    },
    /**
     * Repo-level latest commit (not per-file — GitHub's own UI computes
     * per-file last-commit info via an internal API; doing that with the
     * plain REST API would mean one commit-history call per visible file,
     * which doesn't scale). Also returns the total commit count on this
     * branch, via the Link-header trick above.
     */
    async getLastCommit(repoId: string, ref?: string) {
        const repo = await RepositoriesServices.findById(repoId);
        const response = await octokit.rest.repos.listCommits({
            owner: ORG_NAME,
            repo: repo.name,
            sha: ref || repo.default_branch,
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
    },
}