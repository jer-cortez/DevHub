import express from 'express';
import { ReviewCommentsController } from '../../controller/reviewComments.controller';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { idParams } from '../../schemas/common.schemas';
import { createReviewCommentBody } from '../../schemas/reviewComments.schemas';

const router = express.Router();

router.get('/all', ReviewCommentsController.findAll);
router.get('/counts', ReviewCommentsController.countByPrIds);
router.get('/issue-counts', ReviewCommentsController.countByIssueIds);
router.get('/:id', validateParams(idParams), ReviewCommentsController.findById);
router.post('/create', validateBody(createReviewCommentBody), ReviewCommentsController.create);
router.delete('/:id', validateParams(idParams), ReviewCommentsController.delete);

export { router as reviewCommentsRouter };
