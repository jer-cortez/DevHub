import express from 'express';
import { ExpertiseController } from '../../controller/expertise.controller';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { prIdParams } from '../../schemas/common.schemas';
import { setOptInBody } from '../../schemas/expertise.schemas';

const router = express.Router();

// Static paths before the parameterised one, so 'opt-in' and 'stats' aren't
// captured as a :prId.
router.get('/opt-in', ExpertiseController.getMyOptIn);
router.put('/opt-in', validateBody(setOptInBody), ExpertiseController.setMyOptIn);
router.get('/stats', ExpertiseController.getStats);
router.get('/suggestions/:prId', validateParams(prIdParams), ExpertiseController.suggestReviewers);

export { router as expertiseRouter };
