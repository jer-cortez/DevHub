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
};
