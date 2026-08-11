"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsServices = void 0;
const reviewsSB_1 = require("../supabase/reviewsSB");
exports.ReviewsServices = {
    async findAll() {
        return reviewsSB_1.ReviewsSB.findAll();
    },
    async findById(id) {
        const review = await reviewsSB_1.ReviewsSB.findById(id);
        if (!review)
            throw new Error('Review not found');
        return review;
    },
    async create(payload) {
        return reviewsSB_1.ReviewsSB.create(payload);
    },
    async delete(id) {
        return reviewsSB_1.ReviewsSB.delete(id);
    },
};
