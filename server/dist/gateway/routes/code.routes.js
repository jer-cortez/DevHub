"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeRouter = void 0;
const express_1 = __importDefault(require("express"));
const code_controller_1 = require("../../controller/code.controller");
const router = express_1.default.Router();
exports.codeRouter = router;
router.get('/:repoId/contents', code_controller_1.codeController.getContents);
