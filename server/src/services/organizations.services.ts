import { OrganizationsSB } from '../supabase/organizationsSB';
import type { organizations, Prisma } from '../generated/prisma/client';

export const OrganizationsServices = {
  async findAll(): Promise<organizations[]> {
    return OrganizationsSB.findAll();
  },
  async findById(id: string): Promise<organizations> {
    const org = await OrganizationsSB.findById(id);
    if (!org) throw new Error('Organization not found');
    return org;
  },
  async create(payload: Prisma.organizationsCreateInput): Promise<organizations> {
    return OrganizationsSB.create(payload);
  },
  async delete(id: string): Promise<organizations> {
    return OrganizationsSB.delete(id);
  },
  async upsertByGithubOrgId(data: {
    github_org_id: bigint;
    name: string;
    avatar_url: string;
  }): Promise<organizations> {
    return OrganizationsSB.upsertByGithubOrgId(data);
  },
};
