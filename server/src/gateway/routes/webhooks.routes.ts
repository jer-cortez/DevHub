import express from 'express';
import { WebhooksController } from '../../controller/webhooks.controller';

const router = express.Router();

// express.raw() here (not the app-wide express.json()) so req.body is the
// exact raw Buffer GitHub signed, required for signature verification.
router.post('/github', express.raw({ type: 'application/json' }), WebhooksController.receive);

export { router as webhooksRouter };
