"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPullRequestReviewerBody = void 0;
const zod_1 = require("zod");
exports.createPullRequestReviewerBody = zod_1.z.object({
    pr_id: zod_1.z.uuid(),
    user_id: zod_1.z.uuid(),
    status: zod_1.z.string().trim().min(1).max(50),
    reviewed_at: zod_1.z.coerce.date().optional(),
    assigned_at: zod_1.z.coerce.date(),
});
