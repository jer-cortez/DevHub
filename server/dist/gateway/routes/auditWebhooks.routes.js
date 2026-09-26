"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditWebhooksRouter = void 0;
const express_1 = __importDefault(require("express"));
const auditWebhooks_controller_1 = require("../../controller/auditWebhooks.controller");
const router = express_1.default.Router();
exports.auditWebhooksRouter = router;
router.post('/github', express_1.default.raw({ type: 'application/json', limit: '2mb' }), auditWebhooks_controller_1.AuditWebhooksController.receive);
