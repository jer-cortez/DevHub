import { PullRequestSB } from '../supabase/pullRequestSB';
import { RepositoriesServices } from './repositories.services';
import { UserServices } from './users.services';
import { octokit } from '../lib/github';
import type { pull_request, Prisma } from '../generated/prisma/client';

const ORG_NAME = process.env.GITHUB_ORG_NAME!;

export const PullRequestServices = {
  async findAll(): Promise<pull_request[]> {
    return PullRequestSB.findAll();
  },
  async findByRepoId(repoId: string): Promise<pull_request[]> {
    return PullRequestSB.findByRepoId(repoId);
  },
  async findById(id: string): Promise<pull_request> {
    const pr = await PullRequestSB.findById(id);
    if (!pr) throw new Error('Pull request not found');
    return pr;
  },
  async create(payload: Prisma.pull_requestCreateInput): Promise<pull_request> {
    const pr = await PullRequestSB.create(payload);
    if (!pr) throw new Error('Could not create pull request');
    return pr;
  },
  async delete(id: string): Promise<pull_request> {
    return PullRequestSB.delete(id);
  },
  async syncFromGithub(repoId: string): Promise<pull_request[]> {
    const repo = await RepositoriesServices.findById(repoId);

    const { data: githubPrs } = await octokit.rest.pulls.list({
      owner: ORG_NAME,
      repo: repo.name,
      state: 'all',
    });

    return Promise.all(
      githubPrs.map(async (pr) => {
        const author = await UserServices.upsertByGithubId({
          github_id: pr.user!.id,
          username: pr.user!.login,
          avatar_url: pr.user!.avatar_url,
        });

        return PullRequestSB.upsertByGithubPrId({
          github_pr_id: BigInt(pr.id),
          github_pr_number: pr.number,
          repo_id: repo.id,
          author_id: author.id,
          title: pr.title,
          body: pr.body,
          status: pr.merged_at ? 'merged' : pr.state,
          base_branch: pr.base.ref,
          head_branch: pr.head.ref,
          github_url: pr.html_url,
          closed_at: pr.closed_at ? new Date(pr.closed_at) : null,
          merged_at: pr.merged_at ? new Date(pr.merged_at) : null,
        });
      })
    );
  },
};
