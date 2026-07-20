import express from 'express';
import { OrganizationMembersController } from '../../controller/organizationMembers.controller';

const router = express.Router();

router.get('/all', OrganizationMembersController.findAll);
router.get('/:id', OrganizationMembersController.findById);
router.post('/create', OrganizationMembersController.create);
router.delete('/:id', OrganizationMembersController.delete);

export { router as orgMembersRouter };
