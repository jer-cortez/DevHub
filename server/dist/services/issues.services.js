"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssuesServices = void 0;
const issuesSB_1 = require("../supabase/issuesSB");
const repositories_services_1 = require("./repositories.services");
const users_services_1 = require("./users.services");
const github_1 = require("../lib/github");
const ORG_NAME = process.env.GITHUB_ORG_NAME;
exports.IssuesServices = {
    async findById(id) {
        const issue = await issuesSB_1.IssuesSB.findById(id);
        if (!issue)
            throw new Error('Issue not found');
        return issue;
    },
    async findByRepoId(repoId) {
        return issuesSB_1.IssuesSB.findByRepoId(repoId);
    },
    async findByRepoIdAndNumber(repoId, issueNumber) {
        return issuesSB_1.IssuesSB.findByRepoIdAndNumber(repoId, issueNumber);
    },
    /**
     * Upserts one issue from a GitHub issue object (webhook payload or API
     * response), upserting its author and assignee first so the foreign keys
     * point at real local user rows.
     */
    async upsertFromGithubData(repoId, issue) {
        const author = await users_services_1.UserServices.upsertByGithubId({
            github_id: issue.user.id,
            username: issue.user.login,
            avatar_url: issue.user.avatar_url,
        });
        // GitHub allows multiple assignees; this schema tracks one, so the
        // first is taken as the primary — enough to answer "is this mine?".
        const githubAssignee = issue.assignee ?? issue.assignees?.[0] ?? null;
        const assignee = githubAssignee
            ? await users_services_1.UserServices.upsertByGithubId({
                github_id: githubAssignee.id,
                username: githubAssignee.login,
                avatar_url: githubAssignee.avatar_url,
            })
            : null;
        return issuesSB_1.IssuesSB.upsertByGithubIssueId({
            github_issue_id: BigInt(issue.id),
            github_issue_number: issue.number,
            repo_id: repoId,
            author_id: author.id,
            assignee_id: assignee?.id ?? null,
            title: issue.title,
            body: issue.body ?? null,
            status: issue.state,
            github_url: issue.html_url,
            closed_at: issue.closed_at ? new Date(issue.closed_at) : null,
        });
    },
    /**
     * Same shape as a comment arriving for an unknown PR: if an issue event
     * references an issue we've never seen (it predates the webhook), fetch
     * and store it rather than dropping the event.
     */
    async ensureSynced(repoId, repoName, issueNumber) {
        const existing = await issuesSB_1.IssuesSB.findByRepoIdAndNumber(repoId, issueNumber);
        if (existing)
            return existing;
        const { data: issue } = await github_1.octokit.rest.issues.get({
            owner: ORG_NAME,
            repo: repoName,
            issue_number: issueNumber,
        });
        return this.upsertFromGithubData(repoId, issue);
    },
    async syncFromGithub(repoId) {
        const repo = await repositories_services_1.RepositoriesServices.findById(repoId);
        const { data: githubIssues } = await github_1.octokit.rest.issues.listForRepo({
            owner: ORG_NAME,
            repo: repo.name,
            state: 'all',
            per_page: 100,
        });
        // GitHub's issues API returns pull requests too — a PR *is* an issue in
        // their data model. Only objects without a `pull_request` key are real
        // issues; the rest already live in our pull_request table.
        const realIssues = githubIssues.filter((issue) => !issue.pull_request);
        await Promise.all(realIssues.map((issue) => this.upsertFromGithubData(repoId, issue)));
        return issuesSB_1.IssuesSB.findByRepoId(repoId);
    },
};
