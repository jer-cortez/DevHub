import express from 'express';
import { DrawingBoardsController } from '../../controller/drawingBoards.controller';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { idParams, repoIdParams } from '../../schemas/common.schemas';
import { createDrawingBoardBody, updateDrawingBoardBody } from '../../schemas/drawingBoards.schemas';

const router = express.Router();

router.get('/all', DrawingBoardsController.findAll);
router.get('/by-repo/:repoId', validateParams(repoIdParams), DrawingBoardsController.findByRepoId);
router.get('/:id', validateParams(idParams), DrawingBoardsController.findById);
router.post('/create', validateBody(createDrawingBoardBody), DrawingBoardsController.create);
router.delete('/:id', validateParams(idParams), DrawingBoardsController.delete);
router.patch('/:id', validateParams(idParams), validateBody(updateDrawingBoardBody), DrawingBoardsController.update);

export { router as drawingBoardsRouter };
