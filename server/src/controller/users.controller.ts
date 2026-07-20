import type { Request, Response } from 'express';
import { UserServices } from '../services/users.services';

export const UserController = {
  async findAll(_req: Request, res: Response) {
    try {
      const users = await UserServices.findAll();
      res.status(200).json({ data: users });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch all users' });
    }
  },
  async findById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const user = await UserServices.findById(id);
      res.status(200).json({ data: user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const newUser = await UserServices.createUser(req.body);
      res.status(201).json({ data: newUser });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  },
  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await UserServices.delete(id);
      res.status(200).json({ message: 'User deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  },
};
