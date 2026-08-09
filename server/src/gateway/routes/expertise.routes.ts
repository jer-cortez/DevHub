import express from 'express';
import { ExpertiseController } from '../../controller/expertise.controller';

const router = express.Router();

// Static paths before the parameterised one, so 'opt-in' and 'stats' aren't
// captured as a :prId.
router.get('/opt-in', ExpertiseController.getMyOptIn);
router.put('/opt-in', ExpertiseController.setMyOptIn);
router.get('/stats', ExpertiseController.getStats);
router.get('/suggestions/:prId', ExpertiseController.suggestReviewers);

export { router as expertiseRouter };
