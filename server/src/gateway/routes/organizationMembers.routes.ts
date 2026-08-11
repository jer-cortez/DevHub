import express from 'express';
import { OrganizationMembersController } from '../../controller/organizationMembers.controller';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import { idParams } from '../../schemas/common.schemas';
import { createOrganizationMemberBody } from '../../schemas/organizationMembers.schemas';
import { githubRateLimiter } from '../middleware/rateLimit.middleware';

const router = express.Router();

router.get('/all', OrganizationMembersController.findAll);
router.get('/members', OrganizationMembersController.findAllWithUserInfo);
router.post('/sync', githubRateLimiter, OrganizationMembersController.sync);
router.get('/:id', validateParams(idParams), OrganizationMembersController.findById);
router.post('/create', validateBody(createOrganizationMemberBody), OrganizationMembersController.create);
router.delete('/:id', validateParams(idParams), OrganizationMembersController.delete);

export { router as orgMembersRouter };
