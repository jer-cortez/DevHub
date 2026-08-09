import express from 'express';
import { OrgHealthController } from '../../controller/orgHealth.controller';

const router = express.Router();

router.get('/', OrgHealthController.getDashboard);

export { router as orgHealthRouter };
