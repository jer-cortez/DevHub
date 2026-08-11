"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhooksRouter = void 0;
const express_1 = __importDefault(require("express"));
const webhooks_controller_1 = require("../../controller/webhooks.controller");
const router = express_1.default.Router();
exports.webhooksRouter = router;
// express.raw() here (not the app-wide express.json()) so req.body is the
// exact raw Buffer GitHub signed, required for signature verification.
router.post('/github', express_1.default.raw({ type: 'application/json' }), webhooks_controller_1.WebhooksController.receive);
