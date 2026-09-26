import express from 'express';
import { EventsController } from '../../controller/events.controller';
import { validateParams } from '../middleware/validate.middleware';
import { z } from 'zod';
import { repoIdParams } from '../../schemas/common.schemas';
import { ORG_EVENTS_KEY } from '../../lib/sse';

const router = express.Router();

// The repository list subscribes to the org-wide channel, while individual
// repository pages use UUIDs. Keep this exception local to the events route.
const eventParams = repoIdParams.extend({
  repoId: z.union([z.uuid(), z.literal(ORG_EVENTS_KEY)]),
});
router.get('/:repoId/events', validateParams(eventParams), EventsController.subscribe);

export { router as eventsRouter };
