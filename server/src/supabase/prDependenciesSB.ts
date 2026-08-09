import { prisma } from '../config/prismaClient';
import type { pr_dependencies } from '../generated/prisma/client';

/** One end of a dependency, with enough context to render it without a second lookup. */
export interface LinkedPr {
  dependency_id: string;
  note: string | null;
  pr_id: string;
  github_pr_number: number;
  title: string;
  status: string;
  github_url: string;
  repo_id: string;
  repo_name: string;
}

/**
 * Selects the PR on the far end of a dependency edge. `$1` is the PR we're
 * looking at; `near`/`far` swap depending on which direction we're walking.
 */
function linkedPrQuery(near: 'blocked_pr_id' | 'blocking_pr_id') {
  const far = near === 'blocked_pr_id' ? 'blocking_pr_id' : 'blocked_pr_id';
  return `
    select d.id as dependency_id, d.note,
           p.id as pr_id, p.github_pr_number, p.title, p.status, p.github_url,
           r.id as repo_id, r.name as repo_name
    from pr_dependencies d
      join pull_request p on p.id = d.${far}
      join repositories r on r.id = p.repo_id
    where d.${near} = $1::uuid
    order by r.name, p.github_pr_number
  `;
}

export const PrDependenciesSB = {
  /** PRs that must merge before this one — the "blocked by" list. */
  async findBlockers(prId: string): Promise<LinkedPr[]> {
    return prisma.$queryRawUnsafe<LinkedPr[]>(linkedPrQuery('blocked_pr_id'), prId);
  },

  /** PRs waiting on this one. Matters when deciding what to merge next. */
  async findBlocking(prId: string): Promise<LinkedPr[]> {
    return prisma.$queryRawUnsafe<LinkedPr[]>(linkedPrQuery('blocking_pr_id'), prId);
  },

  /**
   * Would adding `blocked -> blocking` close a loop?
   *
   * Walks the graph forward from the proposed blocker: if anything it
   * transitively depends on is the PR we're about to block, the edge would
   * create a cycle (A waits on B, B waits on A) and nothing could ever merge.
   * Done as a recursive CTE so it's one round trip regardless of chain depth,
   * and `union` (not `union all`) so an existing cycle in the data can't make
   * this loop forever.
   */
  async wouldCreateCycle(blockedPrId: string, blockingPrId: string): Promise<boolean> {
    const rows = await prisma.$queryRawUnsafe<{ found: number }[]>(
      `
      with recursive reachable as (
        select blocking_pr_id as pr_id from pr_dependencies where blocked_pr_id = $1::uuid
        union
        select d.blocking_pr_id
          from pr_dependencies d
          join reachable rc on d.blocked_pr_id = rc.pr_id
      )
      select 1 as found from reachable where pr_id = $2::uuid limit 1
      `,
      blockingPrId,
      blockedPrId
    );
    return rows.length > 0;
  },

  async create(data: {
    blocked_pr_id: string;
    blocking_pr_id: string;
    note?: string | null;
    created_by: string;
  }): Promise<pr_dependencies> {
    return prisma.pr_dependencies.upsert({
      where: {
        blocked_pr_id_blocking_pr_id: {
          blocked_pr_id: data.blocked_pr_id,
          blocking_pr_id: data.blocking_pr_id,
        },
      },
      update: { note: data.note ?? null },
      create: data,
    });
  },

  async delete(id: string): Promise<pr_dependencies> {
    return prisma.pr_dependencies.delete({ where: { id } });
  },

  async findById(id: string): Promise<pr_dependencies | null> {
    return prisma.pr_dependencies.findUnique({ where: { id } });
  },

  /**
   * Unmerged blocker counts for many PRs at once — one query for a whole PR
   * list rather than one per row. PRs with no blockers are simply absent from
   * the result.
   */
  async countUnmergedBlockers(prIds: string[]): Promise<Record<string, number>> {
    if (prIds.length === 0) return {};

    const rows = await prisma.$queryRawUnsafe<{ blocked_pr_id: string; n: number }[]>(
      `
      select d.blocked_pr_id, count(*)::int as n
      from pr_dependencies d
        join pull_request p on p.id = d.blocking_pr_id
      where d.blocked_pr_id = any($1::uuid[]) and p.status <> 'merged'
      group by d.blocked_pr_id
      `,
      prIds
    );

    return Object.fromEntries(rows.map((r) => [r.blocked_pr_id, r.n]));
  },
};
