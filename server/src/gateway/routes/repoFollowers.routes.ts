import express from 'express';
import { RepoFollowersController } from '../../controller/repoFollowers.controller';

const router = express.Router();

router.get('/all', RepoFollowersController.findAll);
router.get('/:id', RepoFollowersController.findById);
router.post('/create', RepoFollowersController.create);
router.delete('/:id', RepoFollowersController.delete);

export { router as repoFollowersRouter };
