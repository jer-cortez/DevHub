"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prDependenciesRouter = void 0;
const express_1 = __importDefault(require("express"));
const prDependencies_controller_1 = require("../../controller/prDependencies.controller");
const router = express_1.default.Router();
exports.prDependenciesRouter = router;
// Static path first, so 'blocked-counts' isn't captured as a :prId.
router.get('/blocked-counts', prDependencies_controller_1.PrDependenciesController.blockedCounts);
router.get('/:prId', prDependencies_controller_1.PrDependenciesController.getForPr);
router.post('/:prId/link', prDependencies_controller_1.PrDependenciesController.link);
router.delete('/link/:dependencyId', prDependencies_controller_1.PrDependenciesController.unlink);
