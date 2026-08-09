import express from 'express';
import { IssuesController } from '../../controller/issues.controller';

const router = express.Router();

router.get('/by-repo/:repoId', IssuesController.findByRepoId);
router.post('/sync/:repoId', IssuesController.sync);
router.get('/:id', IssuesController.findById);

export { router as issuesRouter };
