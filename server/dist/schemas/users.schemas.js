"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserBody = void 0;
const zod_1 = require("zod");
exports.createUserBody = zod_1.z.object({
    github_id: zod_1.z.number().int().positive(),
    username: zod_1.z.string().trim().min(1).max(255),
    avatar_url: zod_1.z.url().max(2048).optional(),
    email: zod_1.z.email().max(320).optional(),
});
