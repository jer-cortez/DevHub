"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestServices = void 0;
const pullRequestSB_1 = require("../supabase/pullRequestSB");
const repositories_services_1 = require("./repositories.services");
const users_services_1 = require("./users.services");
const github_1 = require("../lib/github");
const ORG_NAME = process.env.GITHUB_ORG_NAME;
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
            return pullRequestSB_1.PullRequestSB.upsertByGithubPrId({
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
        }));
    },
};
