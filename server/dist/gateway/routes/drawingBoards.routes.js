"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawingBoardsRouter = void 0;
const express_1 = __importDefault(require("express"));
const drawingBoards_controller_1 = require("../../controller/drawingBoards.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const common_schemas_1 = require("../../schemas/common.schemas");
const drawingBoards_schemas_1 = require("../../schemas/drawingBoards.schemas");
const router = express_1.default.Router();
exports.drawingBoardsRouter = router;
router.get('/all', drawingBoards_controller_1.DrawingBoardsController.findAll);
router.get('/by-repo/:repoId', (0, validate_middleware_1.validateParams)(common_schemas_1.repoIdParams), drawingBoards_controller_1.DrawingBoardsController.findByRepoId);
router.get('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), drawingBoards_controller_1.DrawingBoardsController.findById);
router.post('/create', (0, validate_middleware_1.validateBody)(drawingBoards_schemas_1.createDrawingBoardBody), drawingBoards_controller_1.DrawingBoardsController.create);
router.delete('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), drawingBoards_controller_1.DrawingBoardsController.delete);
router.patch('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), (0, validate_middleware_1.validateBody)(drawingBoards_schemas_1.updateDrawingBoardBody), drawingBoards_controller_1.DrawingBoardsController.update);
