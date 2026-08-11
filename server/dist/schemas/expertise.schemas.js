"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setOptInBody = void 0;
const zod_1 = require("zod");
exports.setOptInBody = zod_1.z.object({
    allow: zod_1.z.boolean(),
});
