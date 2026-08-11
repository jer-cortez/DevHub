"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrganizationMemberBody = void 0;
const zod_1 = require("zod");
exports.createOrganizationMemberBody = zod_1.z.object({
    user_id: zod_1.z.uuid().optional(),
    org_id: zod_1.z.uuid().optional(),
    joined_at: zod_1.z.coerce.date(),
});
