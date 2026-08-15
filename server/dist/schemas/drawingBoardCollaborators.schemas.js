"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDrawingBoardCollaboratorBody = void 0;
const zod_1 = require("zod");
exports.createDrawingBoardCollaboratorBody = zod_1.z.object({
    board_id: zod_1.z.uuid(),
    user_id: zod_1.z.uuid(),
    permission: zod_1.z.string().trim().min(1).max(50),
    added_at: zod_1.z.coerce.date(),
});
