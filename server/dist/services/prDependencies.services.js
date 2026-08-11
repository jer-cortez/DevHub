"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrDependenciesServices = exports.DependencyError = void 0;
const prDependenciesSB_1 = require("../supabase/prDependenciesSB");
const pullRequest_services_1 = require("./pullRequest.services");
/** Raised for user-correctable problems so the controller can answer 400 rather than 500. */
class DependencyError extends Error {
}
exports.DependencyError = DependencyError;
exports.PrDependenciesServices = {
    async getForPr(prId) {
        const [blockedBy, blocking] = await Promise.all([
            prDependenciesSB_1.PrDependenciesSB.findBlockers(prId),
            prDependenciesSB_1.PrDependenciesSB.findBlocking(prId),
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
    async link(blockedPrId, blockingPrId, createdBy, note) {
        if (blockedPrId === blockingPrId) {
            throw new DependencyError('A pull request cannot block itself');
        }
        // Resolve both first so a bad id fails cleanly here rather than as a
        // foreign-key violation from Postgres.
        const [blocked, blocker] = await Promise.all([
            pullRequest_services_1.PullRequestServices.findById(blockedPrId),
            pullRequest_services_1.PullRequestServices.findById(blockingPrId),
        ]);
        if (blocked.status !== 'open') {
            throw new DependencyError('Only an open pull request can be marked as blocked');
        }
        // Checked before insert rather than repaired after: a cycle means neither
        // PR can ever be unblocked, so it must never reach the table.
        if (await prDependenciesSB_1.PrDependenciesSB.wouldCreateCycle(blockedPrId, blockingPrId)) {
            throw new DependencyError(`That would create a circular dependency — #${blocker.github_pr_number} already waits on #${blocked.github_pr_number}, directly or through another PR`);
        }
        return prDependenciesSB_1.PrDependenciesSB.create({
            blocked_pr_id: blockedPrId,
            blocking_pr_id: blockingPrId,
            note: note ?? null,
            created_by: createdBy,
        });
    },
    async unlink(dependencyId) {
        const existing = await prDependenciesSB_1.PrDependenciesSB.findById(dependencyId);
        if (!existing)
            throw new DependencyError('Dependency not found');
        return prDependenciesSB_1.PrDependenciesSB.delete(dependencyId);
    },
    /** Unmerged-blocker counts for a whole PR list, in one query. */
    async blockedCounts(prIds) {
        return prDependenciesSB_1.PrDependenciesSB.countUnmergedBlockers(prIds);
    },
};
