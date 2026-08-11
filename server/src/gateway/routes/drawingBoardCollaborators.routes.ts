import express from 'express';
import { DrawingBoardCollaboratorsController } from '../../controller/drawingBoardCollaborators.controller';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { idParams } from '../../schemas/common.schemas';
import { createDrawingBoardCollaboratorBody } from '../../schemas/drawingBoardCollaborators.schemas';

const router = express.Router();

router.get('/all', DrawingBoardCollaboratorsController.findAll);
router.get('/:id', validateParams(idParams), DrawingBoardCollaboratorsController.findById);
router.post('/create', validateBody(createDrawingBoardCollaboratorBody), DrawingBoardCollaboratorsController.create);
router.delete('/:id', validateParams(idParams), DrawingBoardCollaboratorsController.delete);

export { router as boardCollaboratorsRouter };
