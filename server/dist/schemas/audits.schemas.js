"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditFeedbackBody = void 0;
const zod_1 = require("zod");
exports.auditFeedbackBody = zod_1.z.object({
    finding_id: zod_1.z.string().min(1).max(200),
    verdict: zod_1.z.enum(['useful', 'incorrect']),
});
