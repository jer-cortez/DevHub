import express from 'express';
import { PullRequestController } from '../../controller/pullRequest.controller';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { idParams, repoIdParams } from '../../schemas/common.schemas';
import { createPullRequestBody } from '../../schemas/pullRequest.schemas';
import { anthropicRateLimiter, githubRateLimiter } from '../middleware/rateLimit.middleware';

const router = express.Router();

router.get('/all', PullRequestController.findAll);
router.get('/by-repo/:repoId', validateParams(repoIdParams), PullRequestController.findByRepo);
router.post('/sync/:repoId', validateParams(repoIdParams), githubRateLimiter, PullRequestController.sync);
// Must precede '/:id' — otherwise Express matches the bare id route first.
router.post('/:id/summarize', validateParams(idParams), anthropicRateLimiter, PullRequestController.summarize);
router.get('/:id', validateParams(idParams), PullRequestController.findById);
router.post('/create', validateBody(createPullRequestBody), PullRequestController.create);
router.delete('/:id', validateParams(idParams), PullRequestController.delete);

export { router as pullRequestRouter };
