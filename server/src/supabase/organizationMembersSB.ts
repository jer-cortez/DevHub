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
};
