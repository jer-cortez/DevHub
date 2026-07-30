import crypto from 'crypto';
import { RepositoriesServices } from './repositories.services';
import { UserServices } from './users.services';
import { PullRequestSB } from '../supabase/pullRequestSB';
import { ReviewCommentsServices } from './reviewComments.services';
import { octokit } from '../lib/github';
import { redisPub, REPO_EVENTS_CHANNEL } from '../lib/redis';
import type { pull_request } from '../generated/prisma/client';

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET!;
const ORG_NAME = process.env.GITHUB_ORG_NAME!;

export const WebhooksServices = {
  /**
   * Verifies GitHub's HMAC-SHA256 signature on the raw request body.
   * GitHub signs every webhook delivery with the secret configured on the
   * webhook; recomputing that same signature here and comparing it is how
   * we confirm a request genuinely came from GitHub and wasn't forged by
   * someone who guessed our endpoint URL.
   *
   * The comparison uses `crypto.timingSafeEqual` instead of `===` on
   * purpose: a naive string comparison returns as soon as it finds the
   * first mismatched byte, so an attacker measuring response times could
   * incrementally guess the correct signature one byte at a time.
   * `timingSafeEqual` always takes the same amount of time regardless of
   * where (or whether) the buffers differ, which closes that side channel.
   */
  verifySignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    if (!signatureHeader) return false;

    const expectedSignature =
      'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

    const expected = Buffer.from(expectedSignature);
    const actual = Buffer.from(signatureHeader);

    // timingSafeEqual throws if lengths differ, rather than returning false,
    // so that has to be checked first.
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  },

  /** Publishes an event to Redis; sse.ts (running on every instance) picks this up and forwards it to whichever browsers are actually connected. */
  async publish(event: { type: 'pull_request' | 'comment'; repoId: string; data: unknown }): Promise<void> {
    await redisPub.publish(REPO_EVENTS_CHANNEL, JSON.stringify(event));
  },

  /** Dispatches a verified webhook payload based on GitHub's `x-github-event` header. Unhandled event types are silently ignored (GitHub sends many event types beyond what this webhook subscribes to). */
  async handleEvent(eventType: string, payload: any): Promise<void> {
    switch (eventType) {
      case 'pull_request':
        await this.handlePullRequestEvent(payload);
        break;
      case 'pull_request_review_comment':
        await this.handleInlineCommentEvent(payload);
        break;
      case 'issue_comment':
        // issue_comment fires for comments on both plain issues and PRs
        // (GitHub models a PR as a special kind of issue). Only
        // `issue.pull_request` being present tells us this comment
        // actually belongs to a PR, not a regular issue.
        if (payload.issue?.pull_request) {
          await this.handleTopLevelCommentEvent(payload);
        }
        break;
      default:
        break;
    }
  },

  /** Upserts a PR from a GitHub API/webhook PR object into our DB, upserting its author first. Shared by the pull_request event handler and the inline-comment handler (whose payload conveniently already includes the full PR object). */
  async upsertPullRequestFromGithubData(repoId: string, pr: any): Promise<pull_request> {
    const author = await UserServices.upsertByGithubId({
      github_id: pr.user.id,
      username: pr.user.login,
      avatar_url: pr.user.avatar_url,
    });

    return PullRequestSB.upsertByGithubPrId({
      github_pr_id: BigInt(pr.id),
      github_pr_number: pr.number,
      repo_id: repoId,
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
  },

  /**
   * Looks up a PR locally by (repo, PR number); if it isn't there yet —
   * e.g. a comment arrived for a PR that predates this webhook being set
   * up — fetches it from GitHub and upserts it on the spot, rather than
   * dropping the comment or erroring out. Used only by the top-level
   * comment handler, since that event's payload doesn't include the full
   * PR object the way the inline-comment event's does.
   */
  async ensurePullRequestSynced(repoId: string, repoName: string, prNumber: number): Promise<pull_request> {
    const existing = await PullRequestSB.findByRepoIdAndNumber(repoId, prNumber);
    if (existing) return existing;

    const { data: pr } = await octokit.rest.pulls.get({
      owner: ORG_NAME,
      repo: repoName,
      pull_number: prNumber,
    });

    return this.upsertPullRequestFromGithubData(repoId, pr);
  },

  async handlePullRequestEvent(payload: any): Promise<void> {
    const repo = await RepositoriesServices.findByGithubRepoId(BigInt(payload.repository.id));
    const updated = await this.upsertPullRequestFromGithubData(repo.id, payload.pull_request);
    await this.publish({ type: 'pull_request', repoId: repo.id, data: updated });
  },

  async handleInlineCommentEvent(payload: any): Promise<void> {
    const repo = await RepositoriesServices.findByGithubRepoId(BigInt(payload.repository.id));
    const pr = await this.upsertPullRequestFromGithubData(repo.id, payload.pull_request);

    const author = await UserServices.upsertByGithubId({
      github_id: payload.comment.user.id,
      username: payload.comment.user.login,
      avatar_url: payload.comment.user.avatar_url,
    });

    const comment = await ReviewCommentsServices.upsertByGithubCommentId({
      github_comment_id: BigInt(payload.comment.id),
      pr_id: pr.id,
      author_id: author.id,
      body: payload.comment.body,
      file_path: payload.comment.path,
      line_number: payload.comment.line ?? payload.comment.original_line ?? null,
      // GitHub's webhook payloads don't expose review-thread resolution
      // status (that's a GraphQL-only concept) or a mapping to our local
      // `reviews` table (which isn't synced in this pass) — both are
      // deliberately simplified for now.
      review_id: null,
      is_resolved: false,
    });

    await this.publish({ type: 'comment', repoId: repo.id, data: comment });
  },

  async handleTopLevelCommentEvent(payload: any): Promise<void> {
    const repo = await RepositoriesServices.findByGithubRepoId(BigInt(payload.repository.id));
    const pr = await this.ensurePullRequestSynced(repo.id, repo.name, payload.issue.number);

    const author = await UserServices.upsertByGithubId({
      github_id: payload.comment.user.id,
      username: payload.comment.user.login,
      avatar_url: payload.comment.user.avatar_url,
    });

    const comment = await ReviewCommentsServices.upsertByGithubCommentId({
      github_comment_id: BigInt(payload.comment.id),
      pr_id: pr.id,
      author_id: author.id,
      body: payload.comment.body,
      file_path: null,
      line_number: null,
      review_id: null,
      is_resolved: false,
    });

    await this.publish({ type: 'comment', repoId: repo.id, data: comment });
  },
};
