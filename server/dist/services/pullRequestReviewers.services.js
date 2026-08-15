"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullRequestReviewersServices = void 0;
const pullRequestReviewersSB_1 = require("../supabase/pullRequestReviewersSB");
exports.PullRequestReviewersServices = {
    async findAll() {
        return pullRequestReviewersSB_1.PullRequestReviewersSB.findAll();
    },
    async findById(id) {
        const reviewer = await pullRequestReviewersSB_1.PullRequestReviewersSB.findById(id);
        if (!reviewer)
            throw new Error('Pull request reviewer not found');
        return reviewer;
    },
    async create(payload) {
        return pullRequestReviewersSB_1.PullRequestReviewersSB.create(payload);
    },
    async delete(id) {
        return pullRequestReviewersSB_1.PullRequestReviewersSB.delete(id);
    },
};
