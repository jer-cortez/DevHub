"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestServices = void 0;
const pullRequestSB_1 = require("../supabase/pullRequestSB");
const pullRequestReviewersSB_1 = require("../supabase/pullRequestReviewersSB");
const reviewsSB_1 = require("../supabase/reviewsSB");
const repositories_services_1 = require("./repositories.services");
const users_services_1 = require("./users.services");
const github_1 = require("../lib/github");
const ORG_NAME = process.env.GITHUB_ORG_NAME;
/**
 * Pulls the review state for one PR: who has been asked to review, and who
 * has actually submitted one.
 *
 * Split out from the PR upsert because it costs two extra GitHub calls per
 * PR — the caller decides when that's worth paying (see `syncFromGithub`).
 * Both tables it writes were previously never populated from GitHub at all,
 * which is why the org health dashboard had no review data to report on.
 */
async function syncReviewState(repoName, prId, prNumber, requestedReviewers, prCreatedAt) {
    const requestedIds = [];
    for (const reviewer of requestedReviewers) {
        const user = await users_services_1.UserServices.upsertByGithubId({
            github_id: reviewer.id,
            username: reviewer.login,
            avatar_url: reviewer.avatar_url,
        });
        requestedIds.push(user.id);
        await pullRequestReviewersSB_1.PullRequestReviewersSB.upsertByPrAndUser({
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
    await pullRequestReviewersSB_1.PullRequestReviewersSB.deleteStaleForPr(prId, requestedIds);
    const { data: reviews } = await github_1.octokit.rest.pulls.listReviews({
        owner: ORG_NAME,
        repo: repoName,
        pull_number: prNumber,
        per_page: 100,
    });
    for (const review of reviews) {
        // Drafts have no submitted_at and aren't visible to anyone else yet.
        if (!review.user || !review.submitted_at)
            continue;
        const reviewer = await users_services_1.UserServices.upsertByGithubId({
            github_id: review.user.id,
            username: review.user.login,
            avatar_url: review.user.avatar_url,
        });
        await reviewsSB_1.ReviewsSB.upsertByGithubReviewId({
            github_review_id: BigInt(review.id),
            pr_id: prId,
            reviewer_id: reviewer.id,
            decision: review.state.toLowerCase(),
            body: review.body || null,
            submitted_at: new Date(review.submitted_at),
        });
    }
}
exports.PullRequestServices = {
    async findAll() {
        return pullRequestSB_1.PullRequestSB.findAll();
    },
    async findByRepoId(repoId) {
        return pullRequestSB_1.PullRequestSB.findByRepoId(repoId);
    },
    async findById(id) {
        const pr = await pullRequestSB_1.PullRequestSB.findById(id);
        if (!pr)
            throw new Error('Pull request not found');
        return pr;
    },
    async create(payload) {
        const pr = await pullRequestSB_1.PullRequestSB.create(payload);
        if (!pr)
            throw new Error('Could not create pull request');
        return pr;
    },
    async delete(id) {
        return pullRequestSB_1.PullRequestSB.delete(id);
    },
    async syncFromGithub(repoId) {
        const repo = await repositories_services_1.RepositoriesServices.findById(repoId);
        const { data: githubPrs } = await github_1.octokit.rest.pulls.list({
            owner: ORG_NAME,
            repo: repo.name,
            state: 'all',
        });
        return Promise.all(githubPrs.map(async (pr) => {
            const author = await users_services_1.UserServices.upsertByGithubId({
                github_id: pr.user.id,
                username: pr.user.login,
                avatar_url: pr.user.avatar_url,
            });
            const saved = await pullRequestSB_1.PullRequestSB.upsertByGithubPrId({
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
                await syncReviewState(repo.name, saved.id, saved.github_pr_number, pr.requested_reviewers ?? [], saved.created_at);
            }
            return saved;
        }));
    },
};
