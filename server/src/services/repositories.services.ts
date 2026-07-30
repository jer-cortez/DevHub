import { RepositoriesSB } from '../supabase/repositoriesSB';
import { OrganizationsServices } from './organizations.services';
import { octokit } from '../lib/github';
import type { repositories, Prisma } from '../generated/prisma/client';

const ORG_NAME = process.env.GITHUB_ORG_NAME!;

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

    return Promise.all(
      githubRepos.map((repo) =>
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
  },
};
