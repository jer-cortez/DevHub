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
  async findByRepoId(repoId: string): Promise<pull_request[]> {
    return prisma.pull_request.findMany({ where: { repo_id: repoId } });
  },
  async upsertByGithubPrId(data: {
    github_pr_id: bigint;
    github_pr_number: number;
    repo_id: string;
    author_id: string;
    title: string;
    body?: string | null;
    status: string;
    base_branch: string;
    head_branch: string;
    github_url: string;
    closed_at?: Date | null;
    merged_at?: Date | null;
  }): Promise<pull_request> {
    const now = new Date();
    return prisma.pull_request.upsert({
      where: { github_pr_id: data.github_pr_id },
      update: { ...data, last_synced_at: now },
      create: { ...data, last_synced_at: now },
    });
  },
};
