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
router.get('/all', notifications_controller_1.NotificationsController.findAll);
router.get('/:id', notifications_controller_1.NotificationsController.findById);
router.post('/create', notifications_controller_1.NotificationsController.create);
router.delete('/:id', notifications_controller_1.NotificationsController.delete);
