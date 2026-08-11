import express from 'express';
import { EventsController } from '../../controller/events.controller';
import { validateParams } from '../middleware/validate.middleware';
import { repoIdParams } from '../../schemas/common.schemas';

const router = express.Router();

router.get('/:repoId/events', validateParams(repoIdParams), EventsController.subscribe);

export { router as eventsRouter };
