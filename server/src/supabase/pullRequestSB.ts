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
  async findByGithubPrId(githubPrId: bigint): Promise<pull_request | null> {
    return prisma.pull_request.findUnique({ where: { github_pr_id: githubPrId } });
  },
  /**
   * PR number is only unique per-repo (not globally, unlike github_pr_id),
   * so this needs both. Used for the issue_comment webhook event, whose
   * payload only carries the PR's number, not its global GitHub id.
   */
  async findByRepoIdAndNumber(repoId: string, prNumber: number): Promise<pull_request | null> {
    return prisma.pull_request.findFirst({ where: { repo_id: repoId, github_pr_number: prNumber } });
  },
  /**
   * Written only by the summarizer. Kept off `upsertByGithubPrId` on purpose:
   * a GitHub sync must not clear a summary, and a summary must not overwrite
   * synced fields.
   */
  async setSummary(
    id: string,
    data: {
      summary: string;
      summary_impact: string;
      summary_sha: string;
      summary_model: string;
      summary_truncated: boolean;
    }
  ): Promise<pull_request> {
    return prisma.pull_request.update({
      where: { id },
      data: { ...data, summarized_at: new Date() },
    });
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
    head_sha: string;
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
