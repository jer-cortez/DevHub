import { DrawingBoardsSB } from '../supabase/drawingBoardsSB';
import type { drawing_boards, Prisma } from '../generated/prisma/client';

export const DrawingBoardsServices = {
  async findAll(): Promise<drawing_boards[]> {
    return DrawingBoardsSB.findAll();
  },
  async findById(id: string): Promise<drawing_boards> {
    const board = await DrawingBoardsSB.findById(id);
    if (!board) throw new Error('Drawing board not found');
    return board;
  },
  async create(payload: Prisma.drawing_boardsCreateInput): Promise<drawing_boards> {
    return DrawingBoardsSB.create(payload);
  },
  async delete(id: string): Promise<drawing_boards> {
    return DrawingBoardsSB.delete(id);
  },
  async update(id: string, data: Prisma.drawing_boardsUpdateInput): Promise<drawing_boards> { 
    return DrawingBoardsSB.update(id, data);
  }
};
