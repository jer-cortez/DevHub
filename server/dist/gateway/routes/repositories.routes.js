"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.repositoriesRouter = void 0;
const express_1 = __importDefault(require("express"));
const repositories_controller_1 = require("../../controller/repositories.controller");
const router = express_1.default.Router();
exports.repositoriesRouter = router;
router.get('/all', repositories_controller_1.RepositoriesController.findAll);
router.post('/sync', repositories_controller_1.RepositoriesController.sync);
router.get('/:id', repositories_controller_1.RepositoriesController.findById);
router.post('/create', repositories_controller_1.RepositoriesController.create);
router.delete('/:id', repositories_controller_1.RepositoriesController.delete);
