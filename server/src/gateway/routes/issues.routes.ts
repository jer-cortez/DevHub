import express from 'express';
import { IssuesController } from '../../controller/issues.controller';
import { validateParams } from '../middleware/validate.middleware';
import { idParams, repoIdParams } from '../../schemas/common.schemas';
import { githubRateLimiter } from '../middleware/rateLimit.middleware';

const router = express.Router();

router.get('/by-repo/:repoId', validateParams(repoIdParams), IssuesController.findByRepoId);
router.post('/sync/:repoId', validateParams(repoIdParams), githubRateLimiter, IssuesController.sync);
router.get('/:id', validateParams(idParams), IssuesController.findById);

export { router as issuesRouter };
