import express from 'express';
import { EventsController } from '../../controller/events.controller';

const router = express.Router();

router.get('/:repoId/events', EventsController.subscribe);

export { router as eventsRouter };
