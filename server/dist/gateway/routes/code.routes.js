"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeRouter = void 0;
const express_1 = __importDefault(require("express"));
const code_controller_1 = require("../../controller/code.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const common_schemas_1 = require("../../schemas/common.schemas");
const router = express_1.default.Router();
exports.codeRouter = router;
router.get('/:repoId/contents', (0, validate_middleware_1.validateParams)(common_schemas_1.repoIdParams), code_controller_1.codeController.getContents);
router.get('/:repoId/branches', (0, validate_middleware_1.validateParams)(common_schemas_1.repoIdParams), code_controller_1.codeController.listBranches);
router.get('/:repoId/last-commit', (0, validate_middleware_1.validateParams)(common_schemas_1.repoIdParams), code_controller_1.codeController.getLastCommit);
