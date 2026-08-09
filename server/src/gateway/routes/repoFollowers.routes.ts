import express from 'express';
import { RepoFollowersController } from '../../controller/repoFollowers.controller';

const router = express.Router();

router.get('/mine', RepoFollowersController.findMine);
router.post('/follow', RepoFollowersController.follow);
router.patch('/:repoId/preferences', RepoFollowersController.updatePreferences);
router.delete('/:repoId', RepoFollowersController.unfollow);

export { router as repoFollowersRouter };
