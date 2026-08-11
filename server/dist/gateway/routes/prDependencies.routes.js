"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prDependenciesRouter = void 0;
const express_1 = __importDefault(require("express"));
const prDependencies_controller_1 = require("../../controller/prDependencies.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const common_schemas_1 = require("../../schemas/common.schemas");
const prDependencies_schemas_1 = require("../../schemas/prDependencies.schemas");
const router = express_1.default.Router();
exports.prDependenciesRouter = router;
// Static path first, so 'blocked-counts' isn't captured as a :prId.
router.get('/blocked-counts', prDependencies_controller_1.PrDependenciesController.blockedCounts);
router.get('/:prId', (0, validate_middleware_1.validateParams)(common_schemas_1.prIdParams), prDependencies_controller_1.PrDependenciesController.getForPr);
router.post('/:prId/link', (0, validate_middleware_1.validateParams)(common_schemas_1.prIdParams), (0, validate_middleware_1.validateBody)(prDependencies_schemas_1.linkDependencyBody), prDependencies_controller_1.PrDependenciesController.link);
router.delete('/link/:dependencyId', (0, validate_middleware_1.validateParams)(common_schemas_1.dependencyIdParams), prDependencies_controller_1.PrDependenciesController.unlink);
