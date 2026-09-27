import express from 'express';
import { requireWorkspaceAdmin } from '../middleware/workspace.middleware';
import { OrganizationsController } from '../../controller/organizations.controller';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { idParams } from '../../schemas/common.schemas';
import { createOrganizationBody } from '../../schemas/organizations.schemas';

const router = express.Router();

router.get('/all', OrganizationsController.findAll);
router.get('/readme', OrganizationsController.getReadme);
router.get('/:id', validateParams(idParams), OrganizationsController.findById);
router.post('/create', requireWorkspaceAdmin, validateBody(createOrganizationBody), OrganizationsController.create);
router.delete('/:id', requireWorkspaceAdmin, validateParams(idParams), OrganizationsController.delete);

export { router as organizationsRouter };
