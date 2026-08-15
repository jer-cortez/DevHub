"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = __importDefault(require("express"));
const users_controller_1 = require("../../controller/users.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const common_schemas_1 = require("../../schemas/common.schemas");
const users_schemas_1 = require("../../schemas/users.schemas");
const router = express_1.default.Router();
exports.usersRouter = router;
router.get('/all', users_controller_1.UserController.findAll);
router.get('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), users_controller_1.UserController.findById);
router.post('/create', (0, validate_middleware_1.validateBody)(users_schemas_1.createUserBody), users_controller_1.UserController.create);
router.delete('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), users_controller_1.UserController.delete);
