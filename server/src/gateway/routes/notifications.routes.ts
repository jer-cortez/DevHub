import express from 'express';
import { NotificationsController } from '../../controller/notifications.controller';

const router = express.Router();

// No `GET /all` here on purpose. Notifications carry PR titles and comment
// context, so an unscoped listing would expose one user's activity to
// another; every route below derives its user from the auth token instead
// of trusting a client-supplied id.
router.get('/mine', NotificationsController.findMine);
router.get('/stream', NotificationsController.subscribe);
router.post('/read-all', NotificationsController.markAllRead);
router.post('/:id/read', NotificationsController.markRead);

export { router as notificationsRouter };
