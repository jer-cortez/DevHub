"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.repoFollowersRouter = void 0;
const express_1 = __importDefault(require("express"));
const repoFollowers_controller_1 = require("../../controller/repoFollowers.controller");
const router = express_1.default.Router();
exports.repoFollowersRouter = router;
router.get('/all', repoFollowers_controller_1.RepoFollowersController.findAll);
router.get('/:id', repoFollowers_controller_1.RepoFollowersController.findById);
router.post('/create', repoFollowers_controller_1.RepoFollowersController.create);
router.delete('/:id', repoFollowers_controller_1.RepoFollowersController.delete);
