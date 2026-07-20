import express from 'express';
import { NotificationsController } from '../../controller/notifications.controller';

const router = express.Router();

router.get('/all', NotificationsController.findAll);
router.get('/:id', NotificationsController.findById);
router.post('/create', NotificationsController.create);
router.delete('/:id', NotificationsController.delete);

export { router as notificationsRouter };
