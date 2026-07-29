"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.boardCollaboratorsRouter = void 0;
const express_1 = __importDefault(require("express"));
const drawingBoardCollaborators_controller_1 = require("../../controller/drawingBoardCollaborators.controller");
const router = express_1.default.Router();
exports.boardCollaboratorsRouter = router;
router.get('/all', drawingBoardCollaborators_controller_1.DrawingBoardCollaboratorsController.findAll);
router.get('/:id', drawingBoardCollaborators_controller_1.DrawingBoardCollaboratorsController.findById);
router.post('/create', drawingBoardCollaborators_controller_1.DrawingBoardCollaboratorsController.create);
router.delete('/:id', drawingBoardCollaborators_controller_1.DrawingBoardCollaboratorsController.delete);
