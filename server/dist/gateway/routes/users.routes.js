"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = __importDefault(require("express"));
const users_controller_1 = require("../../controller/users.controller");
const router = express_1.default.Router();
exports.usersRouter = router;
router.get('/all', users_controller_1.UserController.findAll);
router.get('/:id', users_controller_1.UserController.findById);
router.post('/create', users_controller_1.UserController.create);
router.delete('/:id', users_controller_1.UserController.delete);
