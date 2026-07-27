import { prisma } from '../config/prismaClient';
import type { organizations, Prisma } from '../generated/prisma/client';

export const OrganizationsSB = {
  async findAll(): Promise<organizations[]> {
    return prisma.organizations.findMany();
  },
  async findById(id: string): Promise<organizations | null> {
    return prisma.organizations.findUnique({ where: { id } });
  },
  async create(payload: Prisma.organizationsCreateInput): Promise<organizations> {
    return prisma.organizations.create({ data: payload });
  },
  async delete(id: string): Promise<organizations> {
    return prisma.organizations.delete({ where: { id } });
  },
  async upsertByGithubOrgId(data: {
    github_org_id: bigint;
    name: string;
    avatar_url: string;
  }): Promise<organizations> {
    return prisma.organizations.upsert({
      where: { github_org_id: data.github_org_id },
      update: { name: data.name, avatar_url: data.avatar_url },
      create: { ...data, created_at: new Date() },
    });
  },
};
