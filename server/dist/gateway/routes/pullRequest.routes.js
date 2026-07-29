"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pullRequestRouter = void 0;
const express_1 = __importDefault(require("express"));
const pullRequest_controller_1 = require("../../controller/pullRequest.controller");
const router = express_1.default.Router();
exports.pullRequestRouter = router;
router.get('/all', pullRequest_controller_1.PullRequestController.findAll);
router.get('/by-repo/:repoId', pullRequest_controller_1.PullRequestController.findByRepo);
router.post('/sync/:repoId', pullRequest_controller_1.PullRequestController.sync);
router.get('/:id', pullRequest_controller_1.PullRequestController.findById);
router.post('/create', pullRequest_controller_1.PullRequestController.create);
router.delete('/:id', pullRequest_controller_1.PullRequestController.delete);
