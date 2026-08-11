"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrganizationBody = void 0;
const zod_1 = require("zod");
exports.createOrganizationBody = zod_1.z.object({
    github_org_id: zod_1.z.coerce.bigint(),
    name: zod_1.z.string().trim().min(1).max(255),
    avatar_url: zod_1.z.url().max(2048),
    created_at: zod_1.z.coerce.date(),
});
