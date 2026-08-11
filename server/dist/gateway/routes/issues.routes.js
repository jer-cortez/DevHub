"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issuesRouter = void 0;
const express_1 = __importDefault(require("express"));
const issues_controller_1 = require("../../controller/issues.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const common_schemas_1 = require("../../schemas/common.schemas");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const router = express_1.default.Router();
exports.issuesRouter = router;
router.get('/by-repo/:repoId', (0, validate_middleware_1.validateParams)(common_schemas_1.repoIdParams), issues_controller_1.IssuesController.findByRepoId);
router.post('/sync/:repoId', (0, validate_middleware_1.validateParams)(common_schemas_1.repoIdParams), rateLimit_middleware_1.githubRateLimiter, issues_controller_1.IssuesController.sync);
router.get('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), issues_controller_1.IssuesController.findById);
