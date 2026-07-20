import express from 'express';
import { ReviewsController } from '../../controller/reviews.controller';

const router = express.Router();

router.get('/all', ReviewsController.findAll);
router.get('/:id', ReviewsController.findById);
router.post('/create', ReviewsController.create);
router.delete('/:id', ReviewsController.delete);

export { router as reviewsRouter };
