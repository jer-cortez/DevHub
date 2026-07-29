"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prReviewersRouter = void 0;
const express_1 = __importDefault(require("express"));
const pullRequestReviewers_controller_1 = require("../../controller/pullRequestReviewers.controller");
const router = express_1.default.Router();
exports.prReviewersRouter = router;
router.get('/all', pullRequestReviewers_controller_1.PullRequestReviewersController.findAll);
router.get('/:id', pullRequestReviewers_controller_1.PullRequestReviewersController.findById);
router.post('/create', pullRequestReviewers_controller_1.PullRequestReviewersController.create);
router.delete('/:id', pullRequestReviewers_controller_1.PullRequestReviewersController.delete);
