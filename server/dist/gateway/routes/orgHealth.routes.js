"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgHealthRouter = void 0;
const express_1 = __importDefault(require("express"));
const orgHealth_controller_1 = require("../../controller/orgHealth.controller");
const router = express_1.default.Router();
exports.orgHealthRouter = router;
router.get('/', orgHealth_controller_1.OrgHealthController.getDashboard);
