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
router.get('/mine', repoFollowers_controller_1.RepoFollowersController.findMine);
router.post('/follow', repoFollowers_controller_1.RepoFollowersController.follow);
router.patch('/:repoId/preferences', repoFollowers_controller_1.RepoFollowersController.updatePreferences);
router.delete('/:repoId', repoFollowers_controller_1.RepoFollowersController.unfollow);
