"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgMembersRouter = void 0;
const express_1 = __importDefault(require("express"));
const organizationMembers_controller_1 = require("../../controller/organizationMembers.controller");
const router = express_1.default.Router();
exports.orgMembersRouter = router;
router.get('/all', organizationMembers_controller_1.OrganizationMembersController.findAll);
router.get('/:id', organizationMembers_controller_1.OrganizationMembersController.findById);
router.post('/create', organizationMembers_controller_1.OrganizationMembersController.create);
router.delete('/:id', organizationMembers_controller_1.OrganizationMembersController.delete);
