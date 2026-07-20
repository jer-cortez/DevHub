import { prisma } from '../config/prismaClient';
import type { drawing_board_collaborators, Prisma } from '../generated/prisma/client';

export const DrawingBoardCollaboratorsSB = {
  async findAll(): Promise<drawing_board_collaborators[]> {
    return prisma.drawing_board_collaborators.findMany();
  },
  async findById(id: string): Promise<drawing_board_collaborators | null> {
    return prisma.drawing_board_collaborators.findUnique({ where: { id } });
  },
  async create(payload: Prisma.drawing_board_collaboratorsCreateInput): Promise<drawing_board_collaborators> {
    return prisma.drawing_board_collaborators.create({ data: payload });
  },
  async delete(id: string): Promise<drawing_board_collaborators> {
    return prisma.drawing_board_collaborators.delete({ where: { id } });
  },
};
