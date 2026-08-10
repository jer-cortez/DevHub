"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issuesRouter = void 0;
const express_1 = __importDefault(require("express"));
const issues_controller_1 = require("../../controller/issues.controller");
const router = express_1.default.Router();
exports.issuesRouter = router;
router.get('/by-repo/:repoId', issues_controller_1.IssuesController.findByRepoId);
router.post('/sync/:repoId', issues_controller_1.IssuesController.sync);
router.get('/:id', issues_controller_1.IssuesController.findById);
