import express from 'express';
import { PrDependenciesController } from '../../controller/prDependencies.controller';

const router = express.Router();

// Static path first, so 'blocked-counts' isn't captured as a :prId.
router.get('/blocked-counts', PrDependenciesController.blockedCounts);
router.get('/:prId', PrDependenciesController.getForPr);
router.post('/:prId/link', PrDependenciesController.link);
router.delete('/link/:dependencyId', PrDependenciesController.unlink);

export { router as prDependenciesRouter };
