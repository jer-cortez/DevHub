"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.repoFollowersRouter = void 0;
const express_1 = __importDefault(require("express"));
const repoFollowers_controller_1 = require("../../controller/repoFollowers.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const common_schemas_1 = require("../../schemas/common.schemas");
const repoFollowers_schemas_1 = require("../../schemas/repoFollowers.schemas");
const router = express_1.default.Router();
exports.repoFollowersRouter = router;
router.get('/mine', repoFollowers_controller_1.RepoFollowersController.findMine);
router.post('/follow', (0, validate_middleware_1.validateBody)(repoFollowers_schemas_1.followRepoBody), repoFollowers_controller_1.RepoFollowersController.follow);
router.patch('/:repoId/preferences', (0, validate_middleware_1.validateParams)(common_schemas_1.repoIdParams), (0, validate_middleware_1.validateBody)(repoFollowers_schemas_1.updateFollowPreferencesBody), repoFollowers_controller_1.RepoFollowersController.updatePreferences);
router.delete('/:repoId', (0, validate_middleware_1.validateParams)(common_schemas_1.repoIdParams), repoFollowers_controller_1.RepoFollowersController.unfollow);
