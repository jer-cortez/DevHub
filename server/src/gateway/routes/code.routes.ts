import express from 'express';
import { codeController } from '../../controller/code.controller';

const router = express.Router();

router.get('/:repoId/contents', codeController.getContents);

export { router as codeRouter };
