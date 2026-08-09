import express from 'express';
import { OnboardingController } from '../../controller/onboarding.controller';

const router = express.Router();

router.get('/:prId', OnboardingController.getForPr);

export { router as onboardingRouter };
