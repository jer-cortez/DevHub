import crypto from 'crypto';
import { RepositoriesServices } from './repositories.services';
import { UserServices } from './users.services';
import { IssuesServices } from './issues.services';
import { PullRequestSB } from '../supabase/pullRequestSB';
import { PullRequestReviewersSB } from '../supabase/pullRequestReviewersSB';
import { ReviewCommentsServices } from './reviewComments.services';
import { fanOut } from './notificationFanout';
import { ExpertiseServices } from './expertise.services';
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
  async publish(event: { type: 'pull_request' | 'issue' | 'comment'; repoId: string; data: unknown }): Promise<void> {
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
      case 'issues':
        await this.handleIssueEvent(payload);
        break;
      case 'issue_comment':
        // issue_comment fires for comments on both plain issues and PRs
        // (GitHub models a PR as a special kind of issue). Only
        // `issue.pull_request` being present tells us this comment
        // actually belongs to a PR, not a regular issue.
        if (payload.issue?.pull_request) {
          await this.handleTopLevelCommentEvent(payload);
        } else {
          await this.handleIssueCommentEvent(payload);
        }
        break;
      default:
        break;
    }
  },

  /**
   * Who a PR event *directly* concerns: its author plus anyone whose review
   * was requested. Used to set `is_direct`, which the UI surfaces above
   * general repo activity — the difference between "something happened on
   * your project" and "something is waiting on you".
   */
  async resolvePrDirectUserIds(pr: pull_request): Promise<string[]> {
    const reviewers = await PullRequestReviewersSB.findByPrId(pr.id);
    return [pr.author_id, ...reviewers.map((r) => r.user_id)];
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
      // Drives summary invalidation. A `synchronize` event fires whenever new
      // commits are pushed, so this is what makes a stored summary go stale
      // the moment the code it described changes.
      head_sha: pr.head.sha,
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

    // Two separate deliveries, deliberately: `publish` drives the repo-scoped
    // live PR list (anyone with that repo's page open), while `fanOut` writes
    // durable per-user notifications for team members and followers, which
    // reach them anywhere in the app and survive a page reload.
    await this.publish({ type: 'pull_request', repoId: repo.id, data: updated });

    // Index expertise at merge time — shipped work is the signal worth
    // ranking reviewers on, and doing it here means the index stays current
    // without the backfill script ever running again. Deliberately not
    // awaited into the caller's failure path: a GitHub hiccup while listing
    // files must not fail the webhook, or GitHub will retry the whole
    // delivery and duplicate the notification fan-out below.
    if (payload.action === 'closed' && payload.pull_request.merged) {
      ExpertiseServices.indexPr(updated.id).catch((error) => {
        console.warn(`Expertise indexing failed for PR ${updated.id}:`, error);
      });
    }

    const actor = await UserServices.upsertByGithubId({
      github_id: payload.sender.id,
      username: payload.sender.login,
      avatar_url: payload.sender.avatar_url,
    });

    await fanOut({
      type: 'pull_request',
      repoId: repo.id,
      actorId: actor.id,
      title: `${payload.sender.login} ${payload.action} pull request #${updated.github_pr_number}: ${updated.title}`,
      url: updated.github_url,
      prId: updated.id,
      directUserIds: await this.resolvePrDirectUserIds(updated),
    });
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

    await fanOut({
      type: 'comment',
      repoId: repo.id,
      actorId: author.id,
      title: `${payload.comment.user.login} commented on #${pr.github_pr_number}: ${pr.title}`,
      url: payload.comment.html_url ?? pr.github_url,
      prId: pr.id,
      commentId: comment.id,
      directUserIds: await this.resolvePrDirectUserIds(pr),
    });
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

    await fanOut({
      type: 'comment',
      repoId: repo.id,
      actorId: author.id,
      title: `${payload.comment.user.login} commented on #${pr.github_pr_number}: ${pr.title}`,
      url: payload.comment.html_url ?? pr.github_url,
      prId: pr.id,
      commentId: comment.id,
      directUserIds: await this.resolvePrDirectUserIds(pr),
    });
  },

  /**
   * Real issues (not PRs). Previously this event type was ignored entirely,
   * so nothing in the app knew issues existed.
   */
  async handleIssueEvent(payload: any): Promise<void> {
    const repo = await RepositoriesServices.findByGithubRepoId(BigInt(payload.repository.id));
    const issue = await IssuesServices.upsertFromGithubData(repo.id, payload.issue);

    // Repo-scoped publish keeps the open issues list live, the same way the
    // PR list stays live; the fanOut below is the separate per-user inbox.
    await this.publish({ type: 'issue', repoId: repo.id, data: issue });

    const actor = await UserServices.upsertByGithubId({
      github_id: payload.sender.id,
      username: payload.sender.login,
      avatar_url: payload.sender.avatar_url,
    });

    // An issue directly concerns its author and whoever it's assigned to —
    // "assigned to you" is the clearest case of something needing action.
    const directUserIds = [issue.author_id];
    if (issue.assignee_id) directUserIds.push(issue.assignee_id);

    await fanOut({
      type: 'issue',
      repoId: repo.id,
      actorId: actor.id,
      title: `${payload.sender.login} ${payload.action} issue #${issue.github_issue_number}: ${issue.title}`,
      url: issue.github_url,
      issueId: issue.id,
      directUserIds,
    });
  },

  async handleIssueCommentEvent(payload: any): Promise<void> {
    const repo = await RepositoriesServices.findByGithubRepoId(BigInt(payload.repository.id));
    const issue = await IssuesServices.ensureSynced(repo.id, repo.name, payload.issue.number);

    const author = await UserServices.upsertByGithubId({
      github_id: payload.comment.user.id,
      username: payload.comment.user.login,
      avatar_url: payload.comment.user.avatar_url,
    });

    // Stored in review_comments alongside PR comments, discriminated by
    // issue_id vs pr_id rather than living in a separate table.
    const comment = await ReviewCommentsServices.upsertByGithubCommentId({
      github_comment_id: BigInt(payload.comment.id),
      issue_id: issue.id,
      pr_id: null,
      author_id: author.id,
      body: payload.comment.body,
      file_path: null,
      line_number: null,
      review_id: null,
      is_resolved: false,
    });

    await this.publish({ type: 'comment', repoId: repo.id, data: comment });

    const directUserIds = [issue.author_id];
    if (issue.assignee_id) directUserIds.push(issue.assignee_id);

    await fanOut({
      type: 'comment',
      repoId: repo.id,
      actorId: author.id,
      title: `${payload.comment.user.login} commented on issue #${issue.github_issue_number}: ${issue.title}`,
      url: payload.comment.html_url ?? issue.github_url,
      issueId: issue.id,
      commentId: comment.id,
      directUserIds,
    });
  },
};
