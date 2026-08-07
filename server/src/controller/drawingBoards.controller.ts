import type { Request, Response } from 'express';
import { DrawingBoardsServices } from '../services/drawingBoards.services';
import { UserServices } from '../services/users.services';

export const DrawingBoardsController = {
  async findAll(_req: Request, res: Response) {
    try {
      const boards = await DrawingBoardsServices.findAll();
      res.status(200).json({ data: boards });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch drawing boards' });
    }
  },
  async findById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const board = await DrawingBoardsServices.findById(id);
      res.status(200).json({ data: board });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch drawing board' });
    }
  },
  async create(req: Request, res: Response) {
    try {
      // created_by must come from the authenticated user, not the request
      // body — otherwise any client could claim a board was created by
      // anyone. It also has to be the local `users.id` (Prisma's own UUID),
      // not req.user.id (the Supabase Auth UUID) — those are different
      // ids, same distinction every other author_id/created_by column in
      // this schema already relies on.
      const author = await UserServices.upsertByGithubId({
        github_id: req.user!.github_id,
        username: req.user!.username,
        avatar_url: req.user!.avatar_url,
        email: req.user!.email,
      });

      const board = await DrawingBoardsServices.create({
        ...req.body,
        created_by: author.id,
      });
      res.status(201).json({ data: board });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create drawing board' });
    }
  },
  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await DrawingBoardsServices.delete(id);
      res.status(200).json({ message: 'Drawing board deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete drawing board' });
    }
  },
  async update(req: Request, res: Response) { 
    try { 
      const id = req.params.id as string;
      const data = req.body;

      await DrawingBoardsServices.update(id, data)
      res.status(200).json({ message: 'Drawing board Updated'});
    } catch(error) { 
      res.status(500).json({ error: 'Failed to update drawing board'});
    }
  }, 
  async findByRepoId(req: Request, res: Response) {
    try {
      const repoId = req.params.repoId as string;
      const boards = await DrawingBoardsServices.findByRepoId(repoId);

      res.status(200).json({ data: boards })
    } catch(error) {
      res.status(500).json({ error: 'Failed to fetch boards by repo id' })
    }
  }
};
