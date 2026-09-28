import express from 'express';
import { requireWorkspaceAdmin } from '../middleware/workspace.middleware';
import { OrgHealthController } from '../../controller/orgHealth.controller';

const router = express.Router();

router.get('/', requireWorkspaceAdmin, OrgHealthController.getDashboard);

export { router as orgHealthRouter };
