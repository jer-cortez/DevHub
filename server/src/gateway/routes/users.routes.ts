import express from 'express';
import { UserController } from '../../controller/users.controller';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { idParams } from '../../schemas/common.schemas';
import { createUserBody } from '../../schemas/users.schemas';

const router = express.Router();

router.get('/all', UserController.findAll);
router.get('/:id', validateParams(idParams), UserController.findById);
router.post('/create', validateBody(createUserBody), UserController.create);
router.delete('/:id', validateParams(idParams), UserController.delete);

export { router as usersRouter };
