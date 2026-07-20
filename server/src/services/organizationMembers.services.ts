import { OrganizationMembersSB } from '../supabase/organizationMembersSB';
import type { organization_members, Prisma } from '../generated/prisma/client';

export const OrganizationMembersServices = {
  async findAll(): Promise<organization_members[]> {
    return OrganizationMembersSB.findAll();
  },
  async findById(id: string): Promise<organization_members> {
    const member = await OrganizationMembersSB.findById(id);
    if (!member) throw new Error('Organization member not found');
    return member;
  },
  async create(payload: Prisma.organization_membersCreateInput): Promise<organization_members> {
    return OrganizationMembersSB.create(payload);
  },
  async delete(id: string): Promise<organization_members> {
    return OrganizationMembersSB.delete(id);
  },
};
