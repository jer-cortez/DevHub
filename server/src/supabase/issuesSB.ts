import { prisma } from '../config/prismaClient';
import type { issues } from '../generated/prisma/client';

export const IssuesSB = {
  async findById(id: string): Promise<issues | null> {
    return prisma.issues.findUnique({ where: { id } });
  },
  async findByRepoId(repoId: string): Promise<issues[]> {
    return prisma.issues.findMany({
      where: { repo_id: repoId },
      orderBy: { created_at: 'desc' },
    });
  },
  /** Mirrors PullRequestSB.findByRepoIdAndNumber — GitHub payloads identify an issue by (repo, number), not by our internal uuid. */
  async findByRepoIdAndNumber(repoId: string, issueNumber: number): Promise<issues | null> {
    return prisma.issues.findFirst({
      where: { repo_id: repoId, github_issue_number: issueNumber },
    });
  },
  /**
   * Keyed on github_issue_id (the unique constraint) so replaying a webhook
   * or re-running the sync updates the existing row instead of inserting a
   * duplicate — same pattern as PullRequestSB.upsertByGithubPrId.
   */
  async upsertByGithubIssueId(data: {
    github_issue_id: bigint;
    github_issue_number: number;
    repo_id: string;
    author_id: string;
    assignee_id?: string | null;
    title: string;
    body?: string | null;
    status: string;
    github_url: string;
    closed_at?: Date | null;
  }): Promise<issues> {
    const payload = { ...data, last_synced_at: new Date() };
    return prisma.issues.upsert({
      where: { github_issue_id: data.github_issue_id },
      update: payload,
      create: payload,
    });
  },
};
