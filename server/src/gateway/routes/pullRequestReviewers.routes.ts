import express from 'express';
import { PullRequestReviewersController } from '../../controller/pullRequestReviewers.controller';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { idParams } from '../../schemas/common.schemas';
import { createPullRequestReviewerBody } from '../../schemas/pullRequestReviewers.schemas';

const router = express.Router();

router.get('/all', PullRequestReviewersController.findAll);
router.get('/:id', validateParams(idParams), PullRequestReviewersController.findById);
router.post('/create', validateBody(createPullRequestReviewerBody), PullRequestReviewersController.create);
router.delete('/:id', validateParams(idParams), PullRequestReviewersController.delete);

export { router as prReviewersRouter };
