import { PullRequestSB } from '../supabase/pullRequestSB';
import { PullRequestReviewersSB } from '../supabase/pullRequestReviewersSB';
import { ReviewsSB } from '../supabase/reviewsSB';
import { RepositoriesServices } from './repositories.services';
import { UserServices } from './users.services';
import { octokit } from '../lib/github';
import type { pull_request, Prisma } from '../generated/prisma/client';

const ORG_NAME = process.env.GITHUB_ORG_NAME!;

/**
 * Pulls the review state for one PR: who has been asked to review, and who
 * has actually submitted one.
 *
 * Split out from the PR upsert because it costs two extra GitHub calls per
 * PR — the caller decides when that's worth paying (see `syncFromGithub`).
 * Both tables it writes were previously never populated from GitHub at all,
 * which is why the org health dashboard had no review data to report on.
 */
async function syncReviewState(
  repoName: string,
  prId: string,
  prNumber: number,
  requestedReviewers: { id: number; login: string; avatar_url: string }[],
  prCreatedAt: Date
): Promise<void> {
  const requestedIds: string[] = [];
  for (const reviewer of requestedReviewers) {
    const user = await UserServices.upsertByGithubId({
      github_id: reviewer.id,
      username: reviewer.login,
      avatar_url: reviewer.avatar_url,
    });
    requestedIds.push(user.id);
    await PullRequestReviewersSB.upsertByPrAndUser({
      pr_id: prId,
      user_id: user.id,
      status: 'pending',
      // GitHub's PR payload doesn't say when a review was requested, so the
      // PR's own creation time is the closest honest lower bound. It only
      // applies on insert, so a request that predates this sync isn't
      // repeatedly backdated.
      assigned_at: prCreatedAt,
    });
  }

  // Anyone no longer in GitHub's requested list has either reviewed or been
  // un-requested; either way they're not pending on this PR any more.
  await PullRequestReviewersSB.deleteStaleForPr(prId, requestedIds);

  const { data: reviews } = await octokit.rest.pulls.listReviews({
    owner: ORG_NAME,
    repo: repoName,
    pull_number: prNumber,
    per_page: 100,
  });

  for (const review of reviews) {
    // Drafts have no submitted_at and aren't visible to anyone else yet.
    if (!review.user || !review.submitted_at) continue;

    const reviewer = await UserServices.upsertByGithubId({
      github_id: review.user.id,
      username: review.user.login,
      avatar_url: review.user.avatar_url,
    });

    await ReviewsSB.upsertByGithubReviewId({
      github_review_id: BigInt(review.id),
      pr_id: prId,
      reviewer_id: reviewer.id,
      decision: review.state.toLowerCase(),
      body: review.body || null,
      submitted_at: new Date(review.submitted_at),
    });
  }
}

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

        const saved = await PullRequestSB.upsertByGithubPrId({
          github_pr_id: BigInt(pr.id),
          github_pr_number: pr.number,
          repo_id: repo.id,
          author_id: author.id,
          title: pr.title,
          body: pr.body,
          status: pr.merged_at ? 'merged' : pr.state,
          base_branch: pr.base.ref,
          head_branch: pr.head.ref,
          // Drives summary invalidation — a summary is stale as soon as this
          // no longer matches the one it was generated from.
          head_sha: pr.head.sha,
          github_url: pr.html_url,
          closed_at: pr.closed_at ? new Date(pr.closed_at) : null,
          merged_at: pr.merged_at ? new Date(pr.merged_at) : null,
        });

        // Only for open PRs: review state on a closed or merged PR can't
        // become a bottleneck, and skipping them keeps this from costing two
        // GitHub calls per historical PR on every sync.
        if (saved.status === 'open') {
          await syncReviewState(
            repo.name,
            saved.id,
            saved.github_pr_number,
            pr.requested_reviewers ?? [],
            saved.created_at
          );
        }

        return saved;
      })
    );
  },
};
