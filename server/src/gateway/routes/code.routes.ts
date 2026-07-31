import express from 'express';
import { codeController } from '../../controller/code.controller';

const router = express.Router();

router.get('/:repoId/contents', codeController.getContents);
router.get('/:repoId/branches', codeController.listBranches);

export { router as codeRouter };
