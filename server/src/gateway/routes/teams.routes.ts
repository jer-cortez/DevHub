import express from 'express';
import { TeamsController } from '../../controller/teams.controller';

const router = express.Router();

// `/mine` is declared before `/by-repo/:repoId` for readability only — they
// can't collide, unlike the `/all` vs `/:id` ordering that matters in the
// repositories router.
router.get('/mine', TeamsController.findMine);
router.get('/by-repo/:repoId', TeamsController.findByRepoId);
router.post('/join', TeamsController.join);
router.post('/leave', TeamsController.leave);

export { router as teamsRouter };
