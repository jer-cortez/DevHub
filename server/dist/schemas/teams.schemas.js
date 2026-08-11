"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinTeamBody = void 0;
const zod_1 = require("zod");
exports.joinTeamBody = zod_1.z.object({
    repoId: zod_1.z.uuid(),
});
