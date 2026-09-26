import express from 'express';
import { AuditWebhooksController } from '../../controller/auditWebhooks.controller';

const router = express.Router();
router.post('/github', express.raw({ type: 'application/json', limit: '2mb' }), AuditWebhooksController.receive);

export { router as auditWebhooksRouter };
