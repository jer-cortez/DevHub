import express from 'express';
import { z } from 'zod';
import { ManagedTeamsServices } from '../../services/managedTeams.services';
import { resolveLocalUser } from '../../services/currentUser.services';
import { WorkspaceError } from '../../services/workspace.services';
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
router.put('/by-repo/:repoId/members/:userId', async (req, res) => {
  try {
    const repoId = z.uuid().parse(req.params.repoId);
    const userId = z.uuid().parse(req.params.userId);
    const body = z.object({ role: z.enum(['developer','designer','tech_lead','project_manager']).nullable() }).strict().parse(req.body);
    const user = await resolveLocalUser(req);
    res.json({ data: await ManagedTeamsServices.assign(user.id, userId, repoId, body.role) });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input' });
    if (e instanceof WorkspaceError) return res.status(e.status).json({ error: e.message });
    console.error(e); return res.status(500).json({ error: 'Internal error' });
  }
});
router.post('/join', validateBody(joinTeamBody), TeamsController.join);
router.post('/leave', TeamsController.leave);

export { router as teamsRouter };
