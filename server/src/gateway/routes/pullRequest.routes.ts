import express from 'express';
import { PullRequestController } from '../../controller/pullRequest.controller';

const router = express.Router();

router.get('/all', PullRequestController.findAll);
router.get('/by-repo/:repoId', PullRequestController.findByRepo);
router.post('/sync/:repoId', PullRequestController.sync);
router.get('/:id', PullRequestController.findById);
router.post('/create', PullRequestController.create);
router.delete('/:id', PullRequestController.delete);

export { router as pullRequestRouter };
