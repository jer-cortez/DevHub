"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewsRouter = void 0;
const express_1 = __importDefault(require("express"));
const reviews_controller_1 = require("../../controller/reviews.controller");
const router = express_1.default.Router();
exports.reviewsRouter = router;
router.get('/all', reviews_controller_1.ReviewsController.findAll);
router.get('/:id', reviews_controller_1.ReviewsController.findById);
router.post('/create', reviews_controller_1.ReviewsController.create);
router.delete('/:id', reviews_controller_1.ReviewsController.delete);
