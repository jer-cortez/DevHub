"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceRouter = void 0;
const express_1 = __importDefault(require("express"));
const workspace_controller_1 = require("../../controller/workspace.controller");
const router = express_1.default.Router();
exports.workspaceRouter = router;
router.get('/me', workspace_controller_1.WorkspaceController.mine);
