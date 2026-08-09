import type { Request, Response } from 'express';
import { RepositoriesServices } from '../services/repositories.services';

export const RepositoriesController = {
  async findAll(_req: Request, res: Response) {
    try {
      const repos = await RepositoriesServices.findAll();
      res.status(200).json({ data: repos });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch repositories' });
    }
  },
  async findById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const repo = await RepositoriesServices.findById(id);
      res.status(200).json({ data: repo });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch repository' });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const repo = await RepositoriesServices.create(req.body);
      res.status(201).json({ data: repo });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create repository' });
    }
  },
  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await RepositoriesServices.delete(id);
      res.status(200).json({ message: 'Repository deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete repository' });
    }
  },
  async sync(_req: Request, res: Response) {
    try {
      const repos = await RepositoriesServices.syncFromGithub();
      res.status(200).json({ data: repos });
    } catch (error) {
      console.error('Failed to sync repositories from GitHub:', error);
      res.status(500).json({ error: 'Failed to sync repositories' });
    }
  },
  async listActivity(_req: Request, res: Response) {
    try {
      const activity = await RepositoriesServices.listActivity();
      res.status(200).json({ data: activity });
    } catch (error) {
      console.error('Failed to fetch repository activity:', error);
      res.status(500).json({ error: 'Failed to fetch repository activity' });
    }
  },
};
