import express from 'express';
import { OrganizationsController } from '../../controller/organizations.controller';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { idParams } from '../../schemas/common.schemas';
import { createOrganizationBody } from '../../schemas/organizations.schemas';

const router = express.Router();

router.get('/all', OrganizationsController.findAll);
router.get('/readme', OrganizationsController.getReadme);
router.get('/:id', validateParams(idParams), OrganizationsController.findById);
router.post('/create', validateBody(createOrganizationBody), OrganizationsController.create);
router.delete('/:id', validateParams(idParams), OrganizationsController.delete);

export { router as organizationsRouter };
