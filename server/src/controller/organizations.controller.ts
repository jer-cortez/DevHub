import type { Request, Response } from 'express';
import { OrganizationsServices } from '../services/organizations.services';

export const OrganizationsController = {
  async findAll(_req: Request, res: Response) {
    try {
      const orgs = await OrganizationsServices.findAll();
      res.status(200).json({ data: orgs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  },
  async findById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const org = await OrganizationsServices.findById(id);
      res.status(200).json({ data: org });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch organization' });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const org = await OrganizationsServices.create(req.body);
      res.status(201).json({ data: org });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create organization' });
    }
  },
  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await OrganizationsServices.delete(id);
      res.status(200).json({ message: 'Organization deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete organization' });
    }
  },
};
