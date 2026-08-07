import { prisma } from '../config/prismaClient';
import type { drawing_boards, Prisma } from '../generated/prisma/client';

export const DrawingBoardsSB = {
  async findAll(): Promise<drawing_boards[]> {
    return prisma.drawing_boards.findMany();
  },
  async findById(id: string): Promise<drawing_boards | null> {
    return prisma.drawing_boards.findUnique({ where: { id } });
  },
  async create(payload: Prisma.drawing_boardsCreateInput): Promise<drawing_boards> {
    return prisma.drawing_boards.create({ data: payload });
  },
  async delete(id: string): Promise<drawing_boards> {
    return prisma.drawing_boards.delete({ where: { id } });
  },
  async update(id: string, data: Prisma.drawing_boardsUpdateInput): Promise<drawing_boards> { 
    return prisma.drawing_boards.update({ where: { id }, data })
  }, 
  async findByRepoId(repoId: string): Promise<drawing_boards[]> {
    return prisma.drawing_boards.findMany({ where: { repo_id: repoId } });
  }
};
