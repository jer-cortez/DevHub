"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPullRequestBody = void 0;
const zod_1 = require("zod");
exports.createPullRequestBody = zod_1.z.object({
    github_pr_id: zod_1.z.coerce.bigint(),
    github_pr_number: zod_1.z.number().int().positive(),
    repo_id: zod_1.z.uuid(),
    author_id: zod_1.z.uuid(),
    title: zod_1.z.string().trim().min(1).max(1000),
    body: zod_1.z.string().max(50000).optional(),
    status: zod_1.z.string().trim().min(1).max(50).optional(),
    base_branch: zod_1.z.string().trim().min(1).max(500),
    head_branch: zod_1.z.string().trim().min(1).max(500),
    github_url: zod_1.z.url().max(2048),
    last_synced_at: zod_1.z.coerce.date().optional(),
    closed_at: zod_1.z.coerce.date().optional(),
    merged_at: zod_1.z.coerce.date().optional(),
    head_sha: zod_1.z.string().max(64).optional(),
});
