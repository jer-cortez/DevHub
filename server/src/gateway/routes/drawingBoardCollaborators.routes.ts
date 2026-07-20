import express from 'express';
import { DrawingBoardCollaboratorsController } from '../../controller/drawingBoardCollaborators.controller';

const router = express.Router();

router.get('/all', DrawingBoardCollaboratorsController.findAll);
router.get('/:id', DrawingBoardCollaboratorsController.findById);
router.post('/create', DrawingBoardCollaboratorsController.create);
router.delete('/:id', DrawingBoardCollaboratorsController.delete);

export { router as boardCollaboratorsRouter };
