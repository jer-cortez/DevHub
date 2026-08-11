"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expertiseRouter = void 0;
const express_1 = __importDefault(require("express"));
const expertise_controller_1 = require("../../controller/expertise.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const common_schemas_1 = require("../../schemas/common.schemas");
const expertise_schemas_1 = require("../../schemas/expertise.schemas");
const router = express_1.default.Router();
exports.expertiseRouter = router;
// Static paths before the parameterised one, so 'opt-in' and 'stats' aren't
// captured as a :prId.
router.get('/opt-in', expertise_controller_1.ExpertiseController.getMyOptIn);
router.put('/opt-in', (0, validate_middleware_1.validateBody)(expertise_schemas_1.setOptInBody), expertise_controller_1.ExpertiseController.setMyOptIn);
router.get('/stats', expertise_controller_1.ExpertiseController.getStats);
router.get('/suggestions/:prId', (0, validate_middleware_1.validateParams)(common_schemas_1.prIdParams), expertise_controller_1.ExpertiseController.suggestReviewers);
