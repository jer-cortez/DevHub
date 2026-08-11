"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReviewBody = void 0;
const zod_1 = require("zod");
exports.createReviewBody = zod_1.z.object({
    github_review_id: zod_1.z.coerce.bigint(),
    pr_id: zod_1.z.uuid(),
    reviewer_id: zod_1.z.uuid(),
    decision: zod_1.z.string().trim().min(1).max(50),
    body: zod_1.z.string().max(20000).optional(),
    submitted_at: zod_1.z.coerce.date(),
});
