import express from 'express';
import { RepositoriesController } from '../../controller/repositories.controller';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { idParams } from '../../schemas/common.schemas';
import { createRepositoryBody } from '../../schemas/repositories.schemas';
import { githubRateLimiter } from '../middleware/rateLimit.middleware';

const router = express.Router();

router.get('/all', RepositoriesController.findAll);
router.post('/sync', githubRateLimiter, RepositoriesController.sync);
router.get('/activity', RepositoriesController.listActivity);
router.get('/:id', validateParams(idParams), RepositoriesController.findById);
router.post('/create', validateBody(createRepositoryBody), RepositoriesController.create);
router.delete('/:id', validateParams(idParams), RepositoriesController.delete);

export { router as repositoriesRouter };
