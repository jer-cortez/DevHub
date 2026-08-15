"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReviewCommentBody = void 0;
const zod_1 = require("zod");
exports.createReviewCommentBody = zod_1.z.object({
    github_comment_id: zod_1.z.coerce.bigint(),
    review_id: zod_1.z.uuid().optional(),
    pr_id: zod_1.z.uuid().optional(),
    author_id: zod_1.z.uuid(),
    body: zod_1.z.string().trim().min(1).max(20000),
    file_path: zod_1.z.string().max(1000).optional(),
    line_number: zod_1.z.number().int().nonnegative().optional(),
    is_resolved: zod_1.z.boolean(),
    issue_id: zod_1.z.uuid().optional(),
});
