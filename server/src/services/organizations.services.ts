import { OrganizationsSB } from '../supabase/organizationsSB';
import { octokit } from '../lib/github';
import { cached } from '../lib/cache';
import type { organizations, Prisma } from '../generated/prisma/client';

const ORG_NAME = process.env.GITHUB_ORG_NAME!;

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
  /**
   * The org-wide README GitHub renders on an org's profile page lives at
   * `profile/README.md` in a special repo literally named ".github" — it's
   * opt-in, so most orgs won't have one, and a 404 here just means that.
   * Cached for an hour since org READMEs change rarely.
   */
  async getReadme(): Promise<string | null> {
    const cacheKey = `org:readme:${ORG_NAME}`;
    return cached(cacheKey, 3600, async () => {
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner: ORG_NAME,
          repo: '.github',
          path: 'profile/README.md',
        });
        if (Array.isArray(data) || !('content' in data)) return null;
        return Buffer.from(data.content, 'base64').toString('utf-8');
      } catch {
        return null;
      }
    });
  },
};
