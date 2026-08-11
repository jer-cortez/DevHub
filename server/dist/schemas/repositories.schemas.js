"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRepositoryBody = void 0;
const zod_1 = require("zod");
exports.createRepositoryBody = zod_1.z.object({
    github_repo_id: zod_1.z.coerce.bigint(),
    org_id: zod_1.z.uuid(),
    name: zod_1.z.string().trim().min(1).max(255),
    description: zod_1.z.string().max(2000),
    is_private: zod_1.z.boolean(),
    default_branch: zod_1.z.string().trim().min(1).max(255),
    last_synced_at: zod_1.z.coerce.date(),
});
