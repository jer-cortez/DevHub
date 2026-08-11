"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pullRequestRouter = void 0;
const express_1 = __importDefault(require("express"));
const pullRequest_controller_1 = require("../../controller/pullRequest.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const common_schemas_1 = require("../../schemas/common.schemas");
const pullRequest_schemas_1 = require("../../schemas/pullRequest.schemas");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const router = express_1.default.Router();
exports.pullRequestRouter = router;
router.get('/all', pullRequest_controller_1.PullRequestController.findAll);
router.get('/by-repo/:repoId', (0, validate_middleware_1.validateParams)(common_schemas_1.repoIdParams), pullRequest_controller_1.PullRequestController.findByRepo);
router.post('/sync/:repoId', (0, validate_middleware_1.validateParams)(common_schemas_1.repoIdParams), rateLimit_middleware_1.githubRateLimiter, pullRequest_controller_1.PullRequestController.sync);
// Must precede '/:id' — otherwise Express matches the bare id route first.
router.post('/:id/summarize', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), rateLimit_middleware_1.anthropicRateLimiter, pullRequest_controller_1.PullRequestController.summarize);
router.get('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), pullRequest_controller_1.PullRequestController.findById);
router.post('/create', (0, validate_middleware_1.validateBody)(pullRequest_schemas_1.createPullRequestBody), pullRequest_controller_1.PullRequestController.create);
router.delete('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), pullRequest_controller_1.PullRequestController.delete);
