"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prReviewersRouter = void 0;
const express_1 = __importDefault(require("express"));
const pullRequestReviewers_controller_1 = require("../../controller/pullRequestReviewers.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const common_schemas_1 = require("../../schemas/common.schemas");
const pullRequestReviewers_schemas_1 = require("../../schemas/pullRequestReviewers.schemas");
const router = express_1.default.Router();
exports.prReviewersRouter = router;
router.get('/all', pullRequestReviewers_controller_1.PullRequestReviewersController.findAll);
router.get('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), pullRequestReviewers_controller_1.PullRequestReviewersController.findById);
router.post('/create', (0, validate_middleware_1.validateBody)(pullRequestReviewers_schemas_1.createPullRequestReviewerBody), pullRequestReviewers_controller_1.PullRequestReviewersController.create);
router.delete('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), pullRequestReviewers_controller_1.PullRequestReviewersController.delete);
