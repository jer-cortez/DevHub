import { PrDependenciesSB, type LinkedPr } from '../supabase/prDependenciesSB';
import { PullRequestServices } from './pullRequest.services';

/**
 * Cross-repo PR dependencies. Advisory only: this records and surfaces that
 * one PR is waiting on another, but nothing here can stop a merge on GitHub.
 * Enforcement would mean posting a check run against the blocked PR's head
 * SHA, which needs Checks:write on the token and branch protection set to
 * require it.
 */

export interface PrDependencyView {
  /** PRs that must merge before this one. */
  blockedBy: LinkedPr[];
  /** PRs waiting on this one to merge. */
  blocking: LinkedPr[];
  /** True when any blocker hasn't merged yet. */
  isBlocked: boolean;
  /**
   * Blockers that were closed without merging. These are the confusing case:
   * the dependency will never resolve on its own, so the link probably wants
   * removing — but silently treating it as satisfied would be wrong.
   */
  abandonedBlockers: LinkedPr[];
}

/** Raised for user-correctable problems so the controller can answer 400 rather than 500. */
export class DependencyError extends Error {}

export const PrDependenciesServices = {
  async getForPr(prId: string): Promise<PrDependencyView> {
    const [blockedBy, blocking] = await Promise.all([
      PrDependenciesSB.findBlockers(prId),
      PrDependenciesSB.findBlocking(prId),
    ]);

    const unmerged = blockedBy.filter((pr) => pr.status !== 'merged');

    return {
      blockedBy,
      blocking,
      isBlocked: unmerged.length > 0,
      abandonedBlockers: unmerged.filter((pr) => pr.status === 'closed'),
    };
  },

  /**
   * Links `blockedPrId` as waiting on `blockingPrId`. Both may live in
   * different repositories — that's the point of the feature.
   */
  async link(
    blockedPrId: string,
    blockingPrId: string,
    createdBy: string,
    note?: string | null
  ) {
    if (blockedPrId === blockingPrId) {
      throw new DependencyError('A pull request cannot block itself');
    }

    // Resolve both first so a bad id fails cleanly here rather than as a
    // foreign-key violation from Postgres.
    const [blocked, blocker] = await Promise.all([
      PullRequestServices.findById(blockedPrId),
      PullRequestServices.findById(blockingPrId),
    ]);

    if (blocked.status !== 'open') {
      throw new DependencyError('Only an open pull request can be marked as blocked');
    }

    // Checked before insert rather than repaired after: a cycle means neither
    // PR can ever be unblocked, so it must never reach the table.
    if (await PrDependenciesSB.wouldCreateCycle(blockedPrId, blockingPrId)) {
      throw new DependencyError(
        `That would create a circular dependency — #${blocker.github_pr_number} already waits on #${blocked.github_pr_number}, directly or through another PR`
      );
    }

    return PrDependenciesSB.create({
      blocked_pr_id: blockedPrId,
      blocking_pr_id: blockingPrId,
      note: note ?? null,
      created_by: createdBy,
    });
  },

  async unlink(dependencyId: string) {
    const existing = await PrDependenciesSB.findById(dependencyId);
    if (!existing) throw new DependencyError('Dependency not found');
    return PrDependenciesSB.delete(dependencyId);
  },

  /** Unmerged-blocker counts for a whole PR list, in one query. */
  async blockedCounts(prIds: string[]): Promise<Record<string, number>> {
    return PrDependenciesSB.countUnmergedBlockers(prIds);
  },
};
