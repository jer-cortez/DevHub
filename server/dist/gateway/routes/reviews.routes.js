"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewsRouter = void 0;
const express_1 = __importDefault(require("express"));
const reviews_controller_1 = require("../../controller/reviews.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const common_schemas_1 = require("../../schemas/common.schemas");
const reviews_schemas_1 = require("../../schemas/reviews.schemas");
const router = express_1.default.Router();
exports.reviewsRouter = router;
router.get('/all', reviews_controller_1.ReviewsController.findAll);
router.get('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), reviews_controller_1.ReviewsController.findById);
router.post('/create', (0, validate_middleware_1.validateBody)(reviews_schemas_1.createReviewBody), reviews_controller_1.ReviewsController.create);
router.delete('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), reviews_controller_1.ReviewsController.delete);
