import express from 'express';
import { ReviewsController } from '../../controller/reviews.controller';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { idParams } from '../../schemas/common.schemas';
import { createReviewBody } from '../../schemas/reviews.schemas';

const router = express.Router();

router.get('/all', ReviewsController.findAll);
router.get('/:id', validateParams(idParams), ReviewsController.findById);
router.post('/create', validateBody(createReviewBody), ReviewsController.create);
router.delete('/:id', validateParams(idParams), ReviewsController.delete);

export { router as reviewsRouter };
