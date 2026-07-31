import type { Request, Response } from 'express';
import { OrganizationMembersServices } from '../services/organizationMembers.services';

export const OrganizationMembersController = {
  async findAll(_req: Request, res: Response) {
    try {
      const members = await OrganizationMembersServices.findAll();
      res.status(200).json({ data: members });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch organization members' });
    }
  },
  async findById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const member = await OrganizationMembersServices.findById(id);
      res.status(200).json({ data: member });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch organization member' });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const member = await OrganizationMembersServices.create(req.body);
      res.status(201).json({ data: member });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create organization member' });
    }
  },
  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await OrganizationMembersServices.delete(id);
      res.status(200).json({ message: 'Organization member deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete organization member' });
    }
  },
  async findAllWithUserInfo(_req: Request, res: Response) {
    try {
      const members = await OrganizationMembersServices.findAllWithUserInfo();
      res.status(200).json({ data: members });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch organization members' });
    }
  },
  async sync(_req: Request, res: Response) {
    try {
      const members = await OrganizationMembersServices.syncFromGithub();
      res.status(200).json({ data: members });
    } catch (error) {
      console.error('Failed to sync organization members from GitHub:', error);
      res.status(500).json({ error: 'Failed to sync organization members' });
    }
  },
};
