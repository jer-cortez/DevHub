import { prisma } from '../config/prismaClient';
import type { organization_members, Prisma } from '../generated/prisma/client';

export const OrganizationMembersSB = {
  async findAll(): Promise<organization_members[]> {
    return prisma.organization_members.findMany();
  },
  async findById(id: string): Promise<organization_members | null> {
    return prisma.organization_members.findUnique({ where: { id } });
  },
  async create(payload: Prisma.organization_membersCreateInput): Promise<organization_members> {
    return prisma.organization_members.create({ data: payload });
  },
  async delete(id: string): Promise<organization_members> {
    return prisma.organization_members.delete({ where: { id } });
  },
  /**
   * Upserts a membership row keyed on the (user_id, org_id) pair, so
   * re-running the members sync doesn't create duplicate rows for people
   * who are already members. `joined_at` is only set on first insert —
   * GitHub's list-members API doesn't return a join date, so there's
   * nothing meaningful to update on an already-existing membership.
   */
  async upsertByUserAndOrg(data: {
    user_id: string;
    org_id: string;
  }): Promise<organization_members> {
    return prisma.organization_members.upsert({
      where: { user_id_org_id: { user_id: data.user_id, org_id: data.org_id } },
      update: {},
      create: { ...data, joined_at: new Date() },
    });
  },
};
