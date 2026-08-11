"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkDependencyBody = void 0;
const zod_1 = require("zod");
exports.linkDependencyBody = zod_1.z.object({
    blocking_pr_id: zod_1.z.uuid(),
    note: zod_1.z.string().max(2000).optional(),
});
