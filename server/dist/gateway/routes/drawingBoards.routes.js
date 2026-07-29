"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawingBoardsRouter = void 0;
const express_1 = __importDefault(require("express"));
const drawingBoards_controller_1 = require("../../controller/drawingBoards.controller");
const router = express_1.default.Router();
exports.drawingBoardsRouter = router;
router.get('/all', drawingBoards_controller_1.DrawingBoardsController.findAll);
router.get('/:id', drawingBoards_controller_1.DrawingBoardsController.findById);
router.post('/create', drawingBoards_controller_1.DrawingBoardsController.create);
router.delete('/:id', drawingBoards_controller_1.DrawingBoardsController.delete);
router.patch('/:id', drawingBoards_controller_1.DrawingBoardsController.update);
