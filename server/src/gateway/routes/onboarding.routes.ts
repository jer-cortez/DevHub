import express from 'express';
import { OnboardingController } from '../../controller/onboarding.controller';
import { validateParams } from '../middleware/validate.middleware';
import { prIdParams } from '../../schemas/common.schemas';

const router = express.Router();

router.get('/:prId', validateParams(prIdParams), OnboardingController.getForPr);

export { router as onboardingRouter };
