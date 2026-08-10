"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRouter = void 0;
const express_1 = __importDefault(require("express"));
const notifications_controller_1 = require("../../controller/notifications.controller");
const router = express_1.default.Router();
exports.notificationsRouter = router;
// No `GET /all` here on purpose. Notifications carry PR titles and comment
// context, so an unscoped listing would expose one user's activity to
// another; every route below derives its user from the auth token instead
// of trusting a client-supplied id.
router.get('/mine', notifications_controller_1.NotificationsController.findMine);
router.get('/stream', notifications_controller_1.NotificationsController.subscribe);
router.post('/read-all', notifications_controller_1.NotificationsController.markAllRead);
router.post('/:id/read', notifications_controller_1.NotificationsController.markRead);
