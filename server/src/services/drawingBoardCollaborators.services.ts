import { DrawingBoardCollaboratorsSB } from '../supabase/drawingBoardCollaboratorsSB';
import type { drawing_board_collaborators, Prisma } from '../generated/prisma/client';

export const DrawingBoardCollaboratorsServices = {
  async findAll(): Promise<drawing_board_collaborators[]> {
    return DrawingBoardCollaboratorsSB.findAll();
  },
  async findById(id: string): Promise<drawing_board_collaborators> {
    const collab = await DrawingBoardCollaboratorsSB.findById(id);
    if (!collab) throw new Error('Board collaborator not found');
    return collab;
  },
  async create(payload: Prisma.drawing_board_collaboratorsCreateInput): Promise<drawing_board_collaborators> {
    return DrawingBoardCollaboratorsSB.create(payload);
  },
  async delete(id: string): Promise<drawing_board_collaborators> {
    return DrawingBoardCollaboratorsSB.delete(id);
  },
};
