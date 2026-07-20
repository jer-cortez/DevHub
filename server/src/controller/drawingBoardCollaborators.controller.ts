import type { Request, Response } from 'express';
import { DrawingBoardCollaboratorsServices } from '../services/drawingBoardCollaborators.services';

export const DrawingBoardCollaboratorsController = {
  async findAll(_req: Request, res: Response) {
    try {
      const collabs = await DrawingBoardCollaboratorsServices.findAll();
      res.status(200).json({ data: collabs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch board collaborators' });
    }
  },
  async findById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const collab = await DrawingBoardCollaboratorsServices.findById(id);
      res.status(200).json({ data: collab });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch board collaborator' });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const collab = await DrawingBoardCollaboratorsServices.create(req.body);
      res.status(201).json({ data: collab });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create board collaborator' });
    }
  },
  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await DrawingBoardCollaboratorsServices.delete(id);
      res.status(200).json({ message: 'Board collaborator deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete board collaborator' });
    }
  },
};
