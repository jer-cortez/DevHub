import type { Request, Response } from 'express';
import { DrawingBoardsServices } from '../services/drawingBoards.services';

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
      const board = await DrawingBoardsServices.create(req.body);
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
    } catch(erros) { 
      res.status(500).json({ error: 'Failed to update drawing board'});
    }
  }
};
