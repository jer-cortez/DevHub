"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditsRouter = void 0;
const express_1 = __importDefault(require("express"));
const audits_controller_1 = require("../../controller/audits.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const common_schemas_1 = require("../../schemas/common.schemas");
const audits_schemas_1 = require("../../schemas/audits.schemas");
const router = express_1.default.Router();
exports.auditsRouter = router;
router.get('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), audits_controller_1.AuditsController.get);
router.post('/:id/cancel', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), audits_controller_1.AuditsController.cancel);
router.post('/:id/feedback', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), (0, validate_middleware_1.validateBody)(audits_schemas_1.auditFeedbackBody), audits_controller_1.AuditsController.feedback);
