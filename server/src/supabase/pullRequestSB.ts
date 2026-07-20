import { prisma } from '../config/prismaClient';
import type { pull_request, Prisma } from '../generated/prisma/client';

export const PullRequestSB = {
  async findAll(): Promise<pull_request[]> {
    return prisma.pull_request.findMany();
  },
  async findById(id: string): Promise<pull_request | null> {
    return prisma.pull_request.findUnique({ where: { id } });
  },
  async create(payload: Prisma.pull_requestCreateInput): Promise<pull_request> {
    return prisma.pull_request.create({ data: payload });
  },
  async delete(id: string): Promise<pull_request> {
    return prisma.pull_request.delete({ where: { id } });
  },
};
