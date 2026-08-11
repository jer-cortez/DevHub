"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewCommentsServices = void 0;
const reviewCommentsSB_1 = require("../supabase/reviewCommentsSB");
exports.ReviewCommentsServices = {
    async findAll() {
        return reviewCommentsSB_1.ReviewCommentsSB.findAll();
    },
    async findById(id) {
        const comment = await reviewCommentsSB_1.ReviewCommentsSB.findById(id);
        if (!comment)
            throw new Error('Review comment not found');
        return comment;
    },
    async create(payload) {
        return reviewCommentsSB_1.ReviewCommentsSB.create(payload);
    },
    async delete(id) {
        return reviewCommentsSB_1.ReviewCommentsSB.delete(id);
    },
    async findByPrId(prId) {
        return reviewCommentsSB_1.ReviewCommentsSB.findByPrId(prId);
    },
    async findByIssueId(issueId) {
        return reviewCommentsSB_1.ReviewCommentsSB.findByIssueId(issueId);
    },
    async upsertByGithubCommentId(data) {
        return reviewCommentsSB_1.ReviewCommentsSB.upsertByGithubCommentId(data);
    },
    async countByPrIds(prIds) {
        return reviewCommentsSB_1.ReviewCommentsSB.countByPrIds(prIds);
    },
    async countByIssueIds(issueIds) {
        return reviewCommentsSB_1.ReviewCommentsSB.countByIssueIds(issueIds);
    },
};
