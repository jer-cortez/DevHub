"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizationsRouter = void 0;
const express_1 = __importDefault(require("express"));
const organizations_controller_1 = require("../../controller/organizations.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const common_schemas_1 = require("../../schemas/common.schemas");
const organizations_schemas_1 = require("../../schemas/organizations.schemas");
const router = express_1.default.Router();
exports.organizationsRouter = router;
router.get('/all', organizations_controller_1.OrganizationsController.findAll);
router.get('/readme', organizations_controller_1.OrganizationsController.getReadme);
router.get('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), organizations_controller_1.OrganizationsController.findById);
router.post('/create', (0, validate_middleware_1.validateBody)(organizations_schemas_1.createOrganizationBody), organizations_controller_1.OrganizationsController.create);
router.delete('/:id', (0, validate_middleware_1.validateParams)(common_schemas_1.idParams), organizations_controller_1.OrganizationsController.delete);
