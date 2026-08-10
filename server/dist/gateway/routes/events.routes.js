"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsRouter = void 0;
const express_1 = __importDefault(require("express"));
const events_controller_1 = require("../../controller/events.controller");
const router = express_1.default.Router();
exports.eventsRouter = router;
router.get('/:repoId/events', events_controller_1.EventsController.subscribe);
