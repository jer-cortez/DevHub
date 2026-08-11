import express from 'express';
import { TeamsController } from '../../controller/teams.controller';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { repoIdParams } from '../../schemas/common.schemas';
import { joinTeamBody } from '../../schemas/teams.schemas';

const router = express.Router();

// `/mine` is declared before `/by-repo/:repoId` for readability only — they
// can't collide, unlike the `/all` vs `/:id` ordering that matters in the
// repositories router.
router.get('/mine', TeamsController.findMine);
router.get('/by-repo/:repoId', validateParams(repoIdParams), TeamsController.findByRepoId);
router.post('/join', validateBody(joinTeamBody), TeamsController.join);
router.post('/leave', TeamsController.leave);

export { router as teamsRouter };
