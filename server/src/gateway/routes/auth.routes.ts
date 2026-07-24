import express from 'express';
import { AuthController } from '../../controller/auth.controller';

const router = express.Router();

router.post('/login', AuthController.login);

export { router as authRouter };
