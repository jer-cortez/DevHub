import { RepositoriesSB } from '../supabase/repositoriesSB';
import type { repositories, Prisma } from '../generated/prisma/client';

export const RepositoriesServices = {
  async findAll(): Promise<repositories[]> {
    return RepositoriesSB.findAll();
  },
  async findById(id: string): Promise<repositories> {
    const repo = await RepositoriesSB.findById(id);
    if (!repo) throw new Error('Repository not found');
    return repo;
  },
  async create(payload: Prisma.repositoriesCreateInput): Promise<repositories> {
    return RepositoriesSB.create(payload);
  },
  async delete(id: string): Promise<repositories> {
    return RepositoriesSB.delete(id);
  },
};
