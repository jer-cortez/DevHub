import { prisma } from '../config/prismaClient';
import type { repositories, Prisma } from '../generated/prisma/client';

export const RepositoriesSB = {
  async findAll(): Promise<repositories[]> {
    return prisma.repositories.findMany();
  },
  async findById(id: string): Promise<repositories | null> {
    return prisma.repositories.findUnique({ where: { id } });
  },
  /** Looks up a local repo row by GitHub's numeric repo id — used by the webhook handler, which only knows the GitHub id from the payload, not our internal UUID. */
  async findByGithubRepoId(githubRepoId: bigint): Promise<repositories | null> {
    return prisma.repositories.findUnique({ where: { github_repo_id: githubRepoId } });
  },
  async create(payload: Prisma.repositoriesCreateInput): Promise<repositories> {
    return prisma.repositories.create({ data: payload });
  },
  async delete(id: string): Promise<repositories> {
    return prisma.repositories.delete({ where: { id } });
  },
  async upsertByGithubRepoId(data: {
    github_repo_id: bigint;
    org_id: string;
    name: string;
    description: string;
    is_private: boolean;
    default_branch: string;
  }): Promise<repositories> {
    const now = new Date();
    return prisma.repositories.upsert({
      where: { github_repo_id: data.github_repo_id },
      update: { ...data, last_synced_at: now },
      create: { ...data, last_synced_at: now },
    });
  },
};
