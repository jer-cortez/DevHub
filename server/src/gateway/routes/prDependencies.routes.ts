import express from 'express';
import { PrDependenciesController } from '../../controller/prDependencies.controller';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { prIdParams, dependencyIdParams } from '../../schemas/common.schemas';
import { linkDependencyBody } from '../../schemas/prDependencies.schemas';

const router = express.Router();

// Static path first, so 'blocked-counts' isn't captured as a :prId.
router.get('/blocked-counts', PrDependenciesController.blockedCounts);
router.get('/:prId', validateParams(prIdParams), PrDependenciesController.getForPr);
router.post('/:prId/link', validateParams(prIdParams), validateBody(linkDependencyBody), PrDependenciesController.link);
router.delete('/link/:dependencyId', validateParams(dependencyIdParams), PrDependenciesController.unlink);

export { router as prDependenciesRouter };
