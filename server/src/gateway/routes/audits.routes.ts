import express from 'express';
import { AuditsController } from '../../controller/audits.controller';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { idParams } from '../../schemas/common.schemas';
import { auditFeedbackBody } from '../../schemas/audits.schemas';

const router = express.Router();
router.get('/:id', validateParams(idParams), AuditsController.get);
router.post('/:id/cancel', validateParams(idParams), AuditsController.cancel);
router.post('/:id/feedback', validateParams(idParams), validateBody(auditFeedbackBody), AuditsController.feedback);

export { router as auditsRouter };
