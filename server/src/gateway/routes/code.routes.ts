import express from 'express';
import { codeController } from '../../controller/code.controller';
import { validateParams } from '../middleware/validate.middleware';
import { repoIdParams } from '../../schemas/common.schemas';

const router = express.Router();

router.get('/:repoId/contents', validateParams(repoIdParams), codeController.getContents);
router.get('/:repoId/branches', validateParams(repoIdParams), codeController.listBranches);
router.get('/:repoId/last-commit', validateParams(repoIdParams), codeController.getLastCommit);

export { router as codeRouter };
