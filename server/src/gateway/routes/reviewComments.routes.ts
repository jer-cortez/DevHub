import express from 'express';
import { ReviewCommentsController } from '../../controller/reviewComments.controller';

const router = express.Router();

router.get('/all', ReviewCommentsController.findAll);
router.get('/:id', ReviewCommentsController.findById);
router.post('/create', ReviewCommentsController.create);
router.delete('/:id', ReviewCommentsController.delete);

export { router as reviewCommentsRouter };
