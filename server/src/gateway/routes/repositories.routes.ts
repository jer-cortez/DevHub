import express from 'express';
import { RepositoriesController } from '../../controller/repositories.controller';

const router = express.Router();

router.get('/all', RepositoriesController.findAll);
router.post('/sync', RepositoriesController.sync);
router.get('/activity', RepositoriesController.listActivity);
router.get('/:id', RepositoriesController.findById);
router.post('/create', RepositoriesController.create);
router.delete('/:id', RepositoriesController.delete);

export { router as repositoriesRouter };
