import express from 'express';
import { WorkspaceController } from '../../controller/workspace.controller';

const router = express.Router();
router.get('/me', WorkspaceController.mine);
export { router as workspaceRouter };
