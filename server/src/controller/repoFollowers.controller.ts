import type { Request, Response } from 'express';
import { RepoFollowersServices } from '../services/repoFollowers.services';

export const RepoFollowersController = {
  async findAll(_req: Request, res: Response) {
    try {
      const followers = await RepoFollowersServices.findAll();
      res.status(200).json({ data: followers });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch repo followers' });
    }
  },
  async findById(req: Request, res: Response) {
    try {
      const id = BigInt(req.params.id as string);
      const follower = await RepoFollowersServices.findById(id);
      res.status(200).json({ data: follower });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch repo follower' });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const follower = await RepoFollowersServices.create(req.body);
      res.status(201).json({ data: follower });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create repo follower' });
    }
  },
  async delete(req: Request, res: Response) {
    try {
      const id = BigInt(req.params.id as string);
      await RepoFollowersServices.delete(id);
      res.status(200).json({ message: 'Repo follower deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete repo follower' });
    }
  },
};
