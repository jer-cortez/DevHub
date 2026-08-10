"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamsRouter = void 0;
const express_1 = __importDefault(require("express"));
const teams_controller_1 = require("../../controller/teams.controller");
const router = express_1.default.Router();
exports.teamsRouter = router;
// `/mine` is declared before `/by-repo/:repoId` for readability only — they
// can't collide, unlike the `/all` vs `/:id` ordering that matters in the
// repositories router.
router.get('/mine', teams_controller_1.TeamsController.findMine);
router.get('/by-repo/:repoId', teams_controller_1.TeamsController.findByRepoId);
router.post('/join', teams_controller_1.TeamsController.join);
router.post('/leave', teams_controller_1.TeamsController.leave);
