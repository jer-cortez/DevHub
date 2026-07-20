import express from 'express';
import { PullRequestReviewersController } from '../../controller/pullRequestReviewers.controller';

const router = express.Router();

router.get('/all', PullRequestReviewersController.findAll);
router.get('/:id', PullRequestReviewersController.findById);
router.post('/create', PullRequestReviewersController.create);
router.delete('/:id', PullRequestReviewersController.delete);

export { router as prReviewersRouter };
