import express from 'express';
import { DrawingBoardsController } from '../../controller/drawingBoards.controller';

const router = express.Router();

router.get('/all', DrawingBoardsController.findAll);
router.get('/:id', DrawingBoardsController.findById);
router.post('/create', DrawingBoardsController.create);
router.delete('/:id', DrawingBoardsController.delete);

export { router as drawingBoardsRouter };
