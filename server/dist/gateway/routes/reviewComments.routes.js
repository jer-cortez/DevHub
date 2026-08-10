"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewCommentsRouter = void 0;
const express_1 = __importDefault(require("express"));
const reviewComments_controller_1 = require("../../controller/reviewComments.controller");
const router = express_1.default.Router();
exports.reviewCommentsRouter = router;
router.get('/all', reviewComments_controller_1.ReviewCommentsController.findAll);
router.get('/counts', reviewComments_controller_1.ReviewCommentsController.countByPrIds);
router.get('/issue-counts', reviewComments_controller_1.ReviewCommentsController.countByIssueIds);
router.get('/:id', reviewComments_controller_1.ReviewCommentsController.findById);
router.post('/create', reviewComments_controller_1.ReviewCommentsController.create);
router.delete('/:id', reviewComments_controller_1.ReviewCommentsController.delete);
