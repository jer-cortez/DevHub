"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.boardCollaboratorsRouter = void 0;
const express_1 = __importDefault(require("express"));
const drawingBoardCollaborators_controller_1 = require("../../controller/drawingBoardCollaborators.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const common_schemas_1 = require("../../schemas/common.schemas");
const drawingBoardCollaborators_schemas_1 = require("../../schemas/drawingBoardCollaborators.schemas");
const router = express_1.default.Router();
exports.boardCollaboratorsRouter = router;
router.get('/all', drawingBoardCollaborators_controller_1.DrawingBoardCollaboratorsController.findAll);
router.get('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), drawingBoardCollaborators_controller_1.DrawingBoardCollaboratorsController.findById);
router.post('/create', (0, validate_middleware_1.validateBody)(drawingBoardCollaborators_schemas_1.createDrawingBoardCollaboratorBody), drawingBoardCollaborators_controller_1.DrawingBoardCollaboratorsController.create);
router.delete('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), drawingBoardCollaborators_controller_1.DrawingBoardCollaboratorsController.delete);
