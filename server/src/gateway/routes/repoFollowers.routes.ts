import express from 'express';
import { RepoFollowersController } from '../../controller/repoFollowers.controller';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { repoIdParams } from '../../schemas/common.schemas';
import { followRepoBody, updateFollowPreferencesBody } from '../../schemas/repoFollowers.schemas';

const router = express.Router();

router.get('/mine', RepoFollowersController.findMine);
router.post('/follow', validateBody(followRepoBody), RepoFollowersController.follow);
router.patch(
  '/:repoId/preferences',
  validateParams(repoIdParams),
  validateBody(updateFollowPreferencesBody),
  RepoFollowersController.updatePreferences
);
router.delete('/:repoId', validateParams(repoIdParams), RepoFollowersController.unfollow);

export { router as repoFollowersRouter };
