import express from 'express';
import { OrganizationsController } from '../../controller/organizations.controller';

const router = express.Router();

router.get('/all', OrganizationsController.findAll);
router.get('/readme', OrganizationsController.getReadme);
router.get('/:id', OrganizationsController.findById);
router.post('/create', OrganizationsController.create);
router.delete('/:id', OrganizationsController.delete);

export { router as organizationsRouter };
