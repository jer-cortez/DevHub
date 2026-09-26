"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsRouter = void 0;
const express_1 = __importDefault(require("express"));
const events_controller_1 = require("../../controller/events.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const zod_1 = require("zod");
const common_schemas_1 = require("../../schemas/common.schemas");
const sse_1 = require("../../lib/sse");
const router = express_1.default.Router();
exports.eventsRouter = router;
// The repository list subscribes to the org-wide channel, while individual
// repository pages use UUIDs. Keep this exception local to the events route.
const eventParams = common_schemas_1.repoIdParams.extend({
    repoId: zod_1.z.union([zod_1.z.uuid(), zod_1.z.literal(sse_1.ORG_EVENTS_KEY)]),
});
router.get('/:repoId/events', (0, validate_middleware_1.validateParams)(eventParams), events_controller_1.EventsController.subscribe);
