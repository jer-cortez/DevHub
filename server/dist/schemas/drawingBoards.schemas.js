"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDrawingBoardBody = exports.createDrawingBoardBody = void 0;
const zod_1 = require("zod");
const common_schemas_1 = require("./common.schemas");
// created_by is intentionally excluded — the controller derives it from the
// authenticated user, never from the request body.
const MAX_CANVAS_BYTES = 5000000;
exports.createDrawingBoardBody = zod_1.z.object({
    repo_id: zod_1.z.uuid(),
    type: zod_1.z.string().trim().min(1).max(50),
    title: zod_1.z.string().trim().min(1).max(255),
    nodes: zod_1.z.any().refine((0, common_schemas_1.isWithinSerializedSize)(MAX_CANVAS_BYTES), 'nodes payload is too large'),
    edges: zod_1.z.any().refine((0, common_schemas_1.isWithinSerializedSize)(MAX_CANVAS_BYTES), 'edges payload is too large'),
});
exports.updateDrawingBoardBody = zod_1.z
    .object({
    type: zod_1.z.string().trim().min(1).max(50),
    title: zod_1.z.string().trim().min(1).max(255),
    nodes: zod_1.z.any().refine((0, common_schemas_1.isWithinSerializedSize)(MAX_CANVAS_BYTES), 'nodes payload is too large'),
    edges: zod_1.z.any().refine((0, common_schemas_1.isWithinSerializedSize)(MAX_CANVAS_BYTES), 'edges payload is too large'),
})
    .partial()
    .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });
