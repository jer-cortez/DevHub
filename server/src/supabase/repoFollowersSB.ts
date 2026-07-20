import { prisma } from '../config/prismaClient';
import type { repo_followers, Prisma } from '../generated/prisma/client';

export const RepoFollowersSB = {
  async findAll(): Promise<repo_followers[]> {
    return prisma.repo_followers.findMany();
  },
  async findById(id: bigint): Promise<repo_followers | null> {
    return prisma.repo_followers.findUnique({ where: { id } });
  },
  async create(payload: Prisma.repo_followersCreateInput): Promise<repo_followers> {
    return prisma.repo_followers.create({ data: payload });
  },
  async delete(id: bigint): Promise<repo_followers> {
    return prisma.repo_followers.delete({ where: { id } });
  },
};
