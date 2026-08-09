import { RepositoriesSB } from '../supabase/repositoriesSB';
import { OrganizationsServices } from './organizations.services';
import { octokit } from '../lib/github';
import { cached, invalidateCachePattern } from '../lib/cache';
import type { repositories, Prisma } from '../generated/prisma/client';

const ORG_NAME = process.env.GITHUB_ORG_NAME!;

export interface RepoActivity {
  repoId: string;
  pushedAt: string | null;
  stargazersCount: number;
  forksCount: number;
  language: string | null;
  /** Commit counts for the last 12 weeks, oldest first — enough for a small sparkline. */
  weeklyCommits: number[];
}

export const RepositoriesServices = {
  async findAll(): Promise<repositories[]> {
    return RepositoriesSB.findAll();
  },
  async findById(id: string): Promise<repositories> {
    const repo = await RepositoriesSB.findById(id);
    if (!repo) throw new Error('Repository not found');
    return repo;
  },
  async create(payload: Prisma.repositoriesCreateInput): Promise<repositories> {
    return RepositoriesSB.create(payload);
  },
  async delete(id: string): Promise<repositories> {
    return RepositoriesSB.delete(id);
  },
  /** Used by the webhook handler to map a GitHub payload's `repository.id` to our local repo row. */
  async findByGithubRepoId(githubRepoId: bigint): Promise<repositories> {
    const repo = await RepositoriesSB.findByGithubRepoId(githubRepoId);
    if (!repo) throw new Error('Repository not found for GitHub repo id');
    return repo;
  },
  async upsertByGithubRepoId(data: {
    github_repo_id: bigint;
    org_id: string;
    name: string;
    description: string;
    is_private: boolean;
    default_branch: string;
  }): Promise<repositories> {
    return RepositoriesSB.upsertByGithubRepoId(data);
  },
  async syncFromGithub(): Promise<repositories[]> {
    const { data: githubOrg } = await octokit.rest.orgs.get({ org: ORG_NAME });

    const org = await OrganizationsServices.upsertByGithubOrgId({
      github_org_id: BigInt(githubOrg.id),
      name: githubOrg.login,
      avatar_url: githubOrg.avatar_url,
    });

    const { data: githubRepos } = await octokit.rest.repos.listForOrg({ org: ORG_NAME });

    // The special ".github" repo exists only to hold the org profile
    // README (see OrganizationsServices.getReadme) — it's not a project
    // repo, so it shouldn't be synced or shown anywhere real repos are.
    const realRepos = githubRepos.filter((repo) => repo.name !== '.github');

    const synced = await Promise.all(
      realRepos.map((repo) =>
        RepositoriesSB.upsertByGithubRepoId({
          github_repo_id: BigInt(repo.id),
          org_id: org.id,
          name: repo.name,
          description: repo.description ?? '',
          is_private: repo.private,
          default_branch: repo.default_branch ?? 'main',
        })
      )
    );

    // The README lives in a repo we don't sync, so there's no other event
    // to hook its cache invalidation to — piggyback on the same manual
    // "Sync from GitHub" action that already refreshes everything else.
    await invalidateCachePattern('org:readme:*');

    return synced;
  },
  /**
   * Repo-level GitHub stats (stars, forks, pushed_at, weekly commit counts)
   * for the overview page's activity-sorted repo list. Cached briefly since
   * these change often relative to code contents, but querying GitHub on
   * every render would burn rate limit fast for no real benefit.
   */
  async getActivity(repoId: string): Promise<RepoActivity> {
    const repo = await RepositoriesServices.findById(repoId);
    const cacheKey = `repo:activity:${repoId}`;

    return cached(cacheKey, 300, async () => {
      const [{ data: repoData }, weeklyCommits] = await Promise.all([
        octokit.rest.repos.get({ owner: ORG_NAME, repo: repo.name }),
        octokit.rest.repos
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
  async listActivity(): Promise<RepoActivity[]> {
    const repos = await RepositoriesSB.findAll();
    return Promise.all(repos.map((repo) => RepositoriesServices.getActivity(repo.id)));
  },
};
