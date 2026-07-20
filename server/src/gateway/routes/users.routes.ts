import express from 'express';
import { UserController } from '../../controller/users.controller';

const router = express.Router();

router.get('/all', UserController.findAll);
router.get('/:id', UserController.findById);
router.post('/create', UserController.create);
router.delete('/:id', UserController.delete);

export { router as usersRouter };
